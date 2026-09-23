from __future__ import annotations

import argparse

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge a LoRA adapter into the base model.")
    parser.add_argument("--base-model", required=True, help="Base Hugging Face model ID/path")
    parser.add_argument("--adapter-path", required=True, help="LoRA adapter directory")
    parser.add_argument("--output-dir", required=True, help="Output merged model directory")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
    )
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    model = PeftModel.from_pretrained(base_model, args.adapter_path)
    merged_model = model.merge_and_unload()

    merged_model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"Merged model saved to: {args.output_dir}")


if __name__ == "__main__":
    main()

