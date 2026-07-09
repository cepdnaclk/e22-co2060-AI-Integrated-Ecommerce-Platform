from __future__ import annotations

import argparse
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a LoRA adapter from approved SFT messages.")
    parser.add_argument("--train-file", required=True, help="Training JSONL file path")
    parser.add_argument("--eval-file", default=None, help="Validation JSONL file path")
    parser.add_argument(
        "--base-model",
        default="meta-llama/Meta-Llama-3-8B-Instruct",
        help="Base Hugging Face model ID",
    )
    parser.add_argument("--output-dir", default="lora_output")
    parser.add_argument("--max-seq-length", type=int, default=1024)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accumulation", type=int, default=8)
    parser.add_argument("--use-4bit", action="store_true")
    return parser.parse_args()


def build_text_from_messages(messages: list[dict]) -> str:
    system = ""
    user = ""
    assistant = ""
    for message in messages:
        role = message.get("role")
        content = str(message.get("content", "")).strip()
        if role == "system":
            system = content
        elif role == "user":
            user = content
        elif role == "assistant":
            assistant = content

    return (
        f"### System:\n{system}\n\n"
        f"### User:\n{user}\n\n"
        f"### Assistant:\n{assistant}"
    )


def main() -> None:
    args = parse_args()

    train_path = Path(args.train_file)
    if not train_path.exists():
        raise FileNotFoundError(f"Train file not found: {train_path}")

    data_files = {"train": str(train_path)}
    if args.eval_file:
        eval_path = Path(args.eval_file)
        if not eval_path.exists():
            raise FileNotFoundError(f"Eval file not found: {eval_path}")
        data_files["validation"] = str(eval_path)

    dataset = load_dataset("json", data_files=data_files)

    def _map_record(record: dict) -> dict:
        return {"text": build_text_from_messages(record["messages"])}

    dataset = dataset.map(_map_record, remove_columns=dataset["train"].column_names)

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model_kwargs = {
        "torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32,
        "device_map": "auto",
    }
    if args.use_4bit:
        model_kwargs["load_in_4bit"] = True

    model = AutoModelForCausalLM.from_pretrained(args.base_model, **model_kwargs)

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accumulation,
        learning_rate=args.learning_rate,
        logging_steps=10,
        save_steps=100,
        eval_strategy="steps" if "validation" in dataset else "no",
        eval_steps=100 if "validation" in dataset else None,
        save_total_limit=2,
        bf16=torch.cuda.is_available(),
        fp16=torch.cuda.is_available(),
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset["train"],
        eval_dataset=dataset.get("validation"),
        peft_config=lora_config,
        args=training_args,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
    )

    trainer.train()
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"LoRA training complete. Adapter saved to: {args.output_dir}")


if __name__ == "__main__":
    main()

