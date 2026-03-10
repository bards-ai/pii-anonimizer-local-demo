#!/bin/bash
# Downloads model files from HuggingFace into public/models/ for same-origin serving.
# Run before build: npm run download-model

set -e

MODEL_ID="bardsai/eu-pii-anonimization"
BASE_URL="https://huggingface.co/${MODEL_ID}/resolve/main"
OUT_DIR="public/models/${MODEL_ID}"

mkdir -p "${OUT_DIR}/onnx"

FILES=(
  "config.json"
  "tokenizer.json"
  "tokenizer_config.json"
)

for file in "${FILES[@]}"; do
  if [ ! -f "${OUT_DIR}/${file}" ]; then
    echo "Downloading ${file}..."
    curl -L -o "${OUT_DIR}/${file}" "${BASE_URL}/${file}"
  else
    echo "Skipping ${file} (already exists)"
  fi
done

ONNX_FILE="onnx/model_quantized.onnx"
if [ ! -f "${OUT_DIR}/${ONNX_FILE}" ]; then
  echo "Downloading ${ONNX_FILE} (~280MB)..."
  curl -L -o "${OUT_DIR}/${ONNX_FILE}" "${BASE_URL}/${ONNX_FILE}"
else
  echo "Skipping ${ONNX_FILE} (already exists)"
fi

echo "Model files ready in ${OUT_DIR}/"
