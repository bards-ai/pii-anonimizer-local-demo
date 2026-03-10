"""
Convert bardsai/eu-pii-anonimization to ONNX format for browser inference.

Usage:
    pip install optimum[onnxruntime]
    python scripts/convert_model.py

This will:
1. Export the model to ONNX format
2. Quantize to INT8 (reduces ~1.1GB -> ~280MB)
3. Push ONNX files to the Hugging Face Hub (same repo)
"""

from optimum.onnxruntime import ORTModelForTokenClassification, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from pathlib import Path

MODEL_ID = "bardsai/eu-pii-anonimization"
OUTPUT_DIR = Path("./onnx_model")
QUANTIZED_DIR = Path("./onnx_model_quantized")


def main():
    print(f"Exporting {MODEL_ID} to ONNX...")
    model = ORTModelForTokenClassification.from_pretrained(
        MODEL_ID, export=True
    )
    model.save_pretrained(OUTPUT_DIR)
    print(f"ONNX model saved to {OUTPUT_DIR}")

    print("Quantizing to INT8...")
    quantizer = ORTQuantizer.from_pretrained(OUTPUT_DIR)
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False)
    quantizer.quantize(save_dir=QUANTIZED_DIR, quantization_config=qconfig)
    print(f"Quantized model saved to {QUANTIZED_DIR}")

    print("\nTo push to Hugging Face Hub, run:")
    print(f"  huggingface-cli upload {MODEL_ID} {QUANTIZED_DIR}/model_quantized.onnx onnx/model_quantized.onnx")
    print(f"  huggingface-cli upload {MODEL_ID} {OUTPUT_DIR}/model.onnx onnx/model.onnx")


if __name__ == "__main__":
    main()
