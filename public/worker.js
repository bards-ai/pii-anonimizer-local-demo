import {
  AutoTokenizer,
  AutoModelForTokenClassification,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = "/models/";

const MODEL_ID = "bardsai/eu-pii-anonimization";

// How much to penalize the "O" label logit (higher = more aggressive detection)
const O_BIAS = -6.0;

let tokenizer = null;
let model = null;
let id2label = null;
let oLabelId = null;

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === "load") {
    try {
      self.postMessage({ type: "status", message: "Loading model..." });

      tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
        progress_callback: (p) => self.postMessage({ type: "progress", data: p }),
      });

      model = await AutoModelForTokenClassification.from_pretrained(MODEL_ID, {
        dtype: "q8",
        progress_callback: (p) => self.postMessage({ type: "progress", data: p }),
      });

      // Extract label mapping from model config
      id2label = model.config.id2label;

      // Find the O label ID
      for (const [id, label] of Object.entries(id2label)) {
        if (label === "O") {
          oLabelId = Number(id);
          break;
        }
      }

      self.postMessage({ type: "loaded" });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  } else if (type === "classify") {
    if (!model || !tokenizer) {
      self.postMessage({ type: "error", message: "Model not loaded yet." });
      return;
    }

    let inputs = null;
    let output = null;

    try {
      self.postMessage({ type: "status", message: "Analyzing text..." });

      inputs = await tokenizer(e.data.text, {
        return_tensors: "onnx",
        truncation: true,
        max_length: 512,
      });

      output = await model(inputs);
      const logitsData = output.logits.data; // Float32Array
      const dims = output.logits.dims;
      const numTokens = dims[1];
      const numLabels = dims[2];

      const inputIds = Array.from(inputs.input_ids.data);

      // Reconstruct offsets manually by decoding each token and finding it in text
      // SentencePiece: ▁ = word boundary (space before), subwords continue without
      const offsets = [];
      let cursor = 0;
      for (let i = 0; i < inputIds.length; i++) {
        const decoded = tokenizer.decode([inputIds[i]], { skip_special_tokens: false });
        // Special tokens (<s>, </s>, <pad>)
        if (decoded === "<s>" || decoded === "</s>" || decoded === "<pad>" || decoded === "<unk>") {
          offsets.push(null);
          continue;
        }

        // Remove ▁ prefix (SentencePiece space marker)
        let piece = decoded.replace(/^▁/, "");

        if (piece === "") {
          // Just a space marker with no content — skip whitespace
          while (cursor < e.data.text.length && e.data.text[cursor] === " ") cursor++;
          offsets.push(null);
          continue;
        }

        // Skip whitespace in source text to align
        if (decoded.startsWith("▁")) {
          while (cursor < e.data.text.length && e.data.text[cursor] === " ") cursor++;
        }

        // Find the piece at current cursor position
        const idx = e.data.text.indexOf(piece, cursor);
        if (idx !== -1 && idx <= cursor + 5) {
          offsets.push([idx, idx + piece.length]);
          cursor = idx + piece.length;
        } else {
          offsets.push(null);
        }
      }

      function mySoftmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map((v) => Math.exp(v - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map((v) => v / sum);
      }

      const results = [];

      for (let i = 0; i < numTokens; i++) {
        const offset = offsets[i];
        if (!offset) continue;

        const start = i * numLabels;
        const tokenLogits = [];
        for (let j = 0; j < numLabels; j++) {
          tokenLogits.push(logitsData[start + j]);
        }

        if (oLabelId !== null) {
          tokenLogits[oLabelId] += O_BIAS;
        }

        const probs = mySoftmax(tokenLogits);

        let bestId = 0;
        let bestScore = probs[0];
        for (let j = 1; j < numLabels; j++) {
          if (probs[j] > bestScore) {
            bestScore = probs[j];
            bestId = j;
          }
        }

        const label = id2label[bestId] || "O";
        if (label === "O") continue;

        results.push({
          entity: label,
          score: bestScore,
          index: i,
          word: e.data.text.slice(offset[0], offset[1]),
          start: offset[0],
          end: offset[1],
        });
      }

      self.postMessage({ type: "result", data: results });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    } finally {
      // Dispose tensors to free WASM memory
      try {
        if (output?.logits?.dispose) output.logits.dispose();
        if (inputs?.input_ids?.dispose) inputs.input_ids.dispose();
        if (inputs?.attention_mask?.dispose) inputs.attention_mask.dispose();
      } catch (_) {}
    }
  }
};
