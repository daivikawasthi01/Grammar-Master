#!/usr/bin/env python3
"""
Preprocesses the official CoNLL-2014 test dataset (.m2 format) into an aligned JSONL benchmark.

Features:
- Multi-annotator reference reconstruction (supports annotator 0 & 1)
- Clean natural English detokenization
- Reproducible subset extraction via fixed seed (seed=42)
- Generates manifest.json recording exact sentence IDs and provenance
"""

import os
import re
import json
import random
from typing import List, Dict, Any, Tuple

RANDOM_SEED = 42
DEFAULT_SUBSET_SIZE = 150
CONTROL_CLEAN_RATIO = 0.15  # ~15% already-correct sentences to measure false-positive rate

def detokenize(tokens: List[str]) -> str:
    """Converts tokenized text with separated punctuation into natural English."""
    text = " ".join(tokens)
    # Punctuation spacing
    text = re.sub(r'\s+([,.:;!?"\'])', r'\1', text)
    # Brackets
    text = re.sub(r'(\()\s+', r'\1', text)
    text = re.sub(r'\s+(\))', r'\1', text)
    # Contractions
    text = re.sub(r"\s+('s|'re|'ve|'d|'ll|'m|n't)\b", r"\1", text)
    # Quotes
    text = text.replace("`` ", '"').replace(" ''", '"')
    return text.strip()

def apply_edits(tokens: List[str], edits: List[Tuple[int, int, str]]) -> List[str]:
    """Applies non-overlapping edits in descending index order."""
    result = list(tokens)
    # Sort descending by start index, then end index
    sorted_edits = sorted(edits, key=lambda e: (e[0], e[1]), reverse=True)
    for start, end, replacement in sorted_edits:
        if start == -1 and end == -1:
            continue
        rep_tokens = replacement.split() if replacement else []
        result[start:end] = rep_tokens
    return result

def parse_m2_file(file_path: str) -> List[Dict[str, Any]]:
    """Parses an M2 file into structured sentence records."""
    records = []
    current_tokens: List[str] = []
    # Map: annotator_id -> list of (start, end, replacement)
    annotator_edits: Dict[int, List[Tuple[int, int, str]]] = {}
    sentence_idx = 0

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                if current_tokens:
                    # Finalize current sentence
                    source_str = detokenize(current_tokens)
                    raw_source = " ".join(current_tokens)
                    
                    # Annotators present in this block
                    annotators = sorted(list(annotator_edits.keys())) if annotator_edits else [0]
                    references = []
                    has_error = False

                    for ann in annotators:
                        edits = annotator_edits.get(ann, [])
                        meaningful_edits = [e for e in edits if not (e[0] == -1 and e[1] == -1)]
                        if meaningful_edits:
                            has_error = True
                        ref_tokens = apply_edits(current_tokens, meaningful_edits)
                        ref_str = detokenize(ref_tokens)
                        if ref_str not in references:
                            references.append(ref_str)

                    if not references:
                        references = [source_str]

                    records.append({
                        "id": sentence_idx,
                        "source": source_str,
                        "raw_source": raw_source,
                        "references": references,
                        "num_annotators": len(annotators),
                        "has_errors": has_error,
                    })
                    sentence_idx += 1

                current_tokens = []
                annotator_edits = {}
                continue

            if line.startswith("S "):
                current_tokens = line[2:].split()
            elif line.startswith("A "):
                parts = line[2:].split("|||")
                if len(parts) >= 6:
                    span = parts[0].split()
                    start, end = int(span[0]), int(span[1])
                    edit_type = parts[1]
                    replacement = parts[2]
                    annotator = int(parts[5])

                    if edit_type != "noop":
                        annotator_edits.setdefault(annotator, []).append((start, end, replacement))
                    else:
                        annotator_edits.setdefault(annotator, []).append((-1, -1, ""))

    return records

def build_benchmark_subset(
    records: List[Dict[str, Any]],
    subset_size: int = DEFAULT_SUBSET_SIZE,
    seed: int = RANDOM_SEED
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Builds a deterministic, pinned benchmark subset with manifest."""
    random.seed(seed)

    error_sentences = [r for r in records if r["has_errors"] and len(r["source"]) > 10]
    clean_sentences = [r for r in records if not r["has_errors"] and len(r["source"]) > 10]

    num_clean = int(subset_size * CONTROL_CLEAN_RATIO)
    num_errors = subset_size - num_clean

    sampled_errors = random.sample(error_sentences, min(num_errors, len(error_sentences)))
    sampled_clean = random.sample(clean_sentences, min(num_clean, len(clean_sentences)))

    combined = sampled_errors + sampled_clean
    # Sort back by original ID for consistency
    combined.sort(key=lambda r: r["id"])

    manifest = {
        "dataset_name": "CoNLL-2014 Test Benchmark (Subset)",
        "source_file": "conll14st-test-data/noalt/official-2014.combined.m2",
        "random_seed": seed,
        "total_source_sentences": len(records),
        "subset_size": len(combined),
        "error_sentence_count": len(sampled_errors),
        "clean_sentence_count": len(sampled_clean),
        "pinned_sentence_ids": [r["id"] for r in combined],
    }

    return combined, manifest

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    m2_path = os.path.join(base_dir, "conll14st-test-data", "noalt", "official-2014.combined.m2")
    datasets_dir = os.path.join(base_dir, "datasets")
    os.makedirs(datasets_dir, exist_ok=True)

    if not os.path.exists(m2_path):
        print(f"Error: M2 file not found at {m2_path}")
        return

    print(f"Parsing M2 file from: {m2_path}...")
    records = parse_m2_file(m2_path)
    print(f"Parsed {len(records)} total sentences ({sum(1 for r in records if r['has_errors'])} with errors).")

    subset, manifest = build_benchmark_subset(records, subset_size=DEFAULT_SUBSET_SIZE, seed=RANDOM_SEED)

    out_jsonl = os.path.join(datasets_dir, "conll2014_subset.jsonl")
    with open(out_jsonl, "w", encoding="utf-8") as f:
        for item in subset:
            f.write(json.dumps(item) + "\n")
    print(f"Wrote {len(subset)} pinned benchmark sentences to: {out_jsonl}")

    out_manifest = os.path.join(datasets_dir, "manifest.json")
    with open(out_manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Saved benchmark manifest to: {out_manifest}")

if __name__ == "__main__":
    main()
