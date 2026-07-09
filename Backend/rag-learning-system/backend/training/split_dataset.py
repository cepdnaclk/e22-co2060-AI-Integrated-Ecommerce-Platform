from __future__ import annotations

import argparse
import random
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split JSONL dataset into train/val sets.")
    parser.add_argument("--input", required=True, help="Input JSONL file path")
    parser.add_argument("--train-ratio", type=float, default=0.9, help="Train split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if not 0.5 <= args.train_ratio < 1.0:
        raise ValueError("train-ratio must be >= 0.5 and < 1.0")

    lines = [line for line in input_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(lines) < 2:
        raise ValueError("Need at least 2 records to create train/val splits.")

    random.seed(args.seed)
    random.shuffle(lines)

    train_count = int(len(lines) * args.train_ratio)
    train_lines = lines[:train_count]
    val_lines = lines[train_count:]

    train_path = input_path.with_name(input_path.stem + "_train.jsonl")
    val_path = input_path.with_name(input_path.stem + "_val.jsonl")

    train_path.write_text("\n".join(train_lines) + "\n", encoding="utf-8")
    val_path.write_text("\n".join(val_lines) + "\n", encoding="utf-8")

    print(f"Split complete: total={len(lines)} train={len(train_lines)} val={len(val_lines)}")
    print(f"Train: {train_path}")
    print(f"Val:   {val_path}")


if __name__ == "__main__":
    main()

