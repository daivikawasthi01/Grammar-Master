# Grammar-Master Benchmark Report

**Mode**: `Diagnostic [Direct LLM Baseline: openai/gpt-oss-120b]`  
**Evaluated on**: N=3 sentences, seed=42, from CoNLL-2014 test set (`conll2014_subset.jsonl`)  
**Generated**: 2026-09-08T12:00:21.375971

---

## 1. Executive Summary

| Metric | Score | Industry Benchmark Context |
| :--- | :--- | :--- |
| **GLEU** | **0.8172** | *Official CoNLL-2014 n-gram precision/recall metric (max over references)* |
| **Semantic Similarity** | **0.9852** | *Cosine embedding similarity (`all-MiniLM-L6-v2`) measuring meaning preservation* |
| **$F_0.5$ Score** | **0.4127** | *Precision-weighted edit F-score (ERRANT methodology)* |
| **Precision** | **0.4074** | *Ratio of proposed edits that were legitimate corrections* |
| **Recall** | **0.4444** | *Ratio of reference errors successfully identified and fixed* |

---

## 2. Latency & Systems Performance

| Latency Metric | Milliseconds |
| :--- | :--- |
| **p50 (Median)** | **709.4 ms** |
| **p95** | **935.9 ms** |
| **Mean** | **724.3 ms** |
| **Min / Max** | **502.3 ms / 961.1 ms** |

---

## 3. Token Economics & Throughput

| Resource | Count / Cost |
| :--- | :--- |
| **Total Prompt Tokens** | 523 |
| **Total Completion Tokens** | 530 |
| **Total Tokens** | 1,053 |
| **Estimated Evaluation Cost** | $0.00073 |
| **Estimated Cost / 1,000 Sentences** | **$0.2424** |

---

## 4. Qualitative Sample Inspections

### Example 1 (ID: 3)
- **Source (Input)**: `People get certain disease because of genetic changes.`
- **Hypothesis (Output)**: `People get certain diseases because of genetic changes.`
- **Reference(s)**: `People get certain diseases because of genetic changes.`
- **Metrics**: GLEU: `1.000` | Sim: `1.000` | $F_{0.5}$: `1.000` | Latency: `709ms`

### Example 2 (ID: 12)
- **Source (Input)**: `When people around us know that we got certain disease, their altitudes will be easily changed, whether caring us too much or keeping away from us.`
- **Hypothesis (Output)**: `When people around us know that we have a certain disease, their attitudes can change easily, whether they care for us too much or keep away from us.`
- **Reference(s)**: `When people around us know that we have certain diseases, their attitude will easily change, whether caring for us too much or keeping away from us.`
- **Metrics**: GLEU: `0.531` | Sim: `0.964` | $F_{0.5}$: `0.238` | Latency: `961ms`

### Example 3 (ID: 19)
- **Source (Input)**: `At the same time, we are prepared to know when there are other members got this disease.`
- **Hypothesis (Output)**: `At the same time, we are prepared to know when there are other members who have this disease.`
- **Reference(s)**: `At the same time, we are prepared to know when there are other members who have got this disease.`
- **Metrics**: GLEU: `0.921` | Sim: `0.991` | $F_{0.5}$: `0.000` | Latency: `502ms`

