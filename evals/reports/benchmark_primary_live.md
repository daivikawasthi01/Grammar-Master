# Grammar-Master Benchmark Report

**Mode**: `Primary [Live App Route: http://localhost:3000/api/grammar-check]`  
**Evaluated on**: N=150 sentences, seed=42, from CoNLL-2014 test set (`conll2014_subset.jsonl`)  
**Generated**: 2026-09-08T12:08:04.525550

---

## 1. Executive Summary

| Metric | Score | Industry Benchmark Context |
| :--- | :--- | :--- |
| **GLEU** | **0.7648** | *Official CoNLL-2014 n-gram precision/recall metric (max over references)* |
| **Semantic Similarity** | **0.9795** | *Cosine embedding similarity (`all-MiniLM-L6-v2`) measuring meaning preservation* |
| **$F_0.5$ Score** | **0.5157** | *Precision-weighted edit F-score (ERRANT methodology)* |
| **Precision** | **0.5179** | *Ratio of proposed edits that were legitimate corrections* |
| **Recall** | **0.5671** | *Ratio of reference errors successfully identified and fixed* |

---

## 2. Latency & Systems Performance

| Latency Metric | Milliseconds |
| :--- | :--- |
| **p50 (Median)** | **2810.7 ms** |
| **p95** | **4011.9 ms** |
| **Mean** | **2499.0 ms** |
| **Min / Max** | **668.2 ms / 4187.3 ms** |

---

## 3. Token Economics & Throughput

| Resource | Count / Cost |
| :--- | :--- |
| **Total Prompt Tokens** | 15,786 |
| **Total Completion Tokens** | 3,730 |
| **Total Tokens** | 19,516 |
| **Estimated Evaluation Cost** | $0.01226 |
| **Estimated Cost / 1,000 Sentences** | **$0.0817** |

---

## 4. Qualitative Sample Inspections

### Example 1 (ID: 3)
- **Source (Input)**: `People get certain disease because of genetic changes.`
- **Hypothesis (Output)**: `People get certain diseases because of genetic changes.`
- **Reference(s)**: `People get certain diseases because of genetic changes.`
- **Metrics**: GLEU: `1.000` | Sim: `1.000` | $F_{0.5}$: `1.000` | Latency: `668ms`

### Example 2 (ID: 12)
- **Source (Input)**: `When people around us know that we got certain disease, their altitudes will be easily changed, whether caring us too much or keeping away from us.`
- **Hypothesis (Output)**: `When people around us know that we have a certain disease, their attitudes can change easily, whether they care for us too much or keep away from us.`
- **Reference(s)**: `When people around us know that we have certain diseases, their attitude will easily change, whether caring for us too much or keeping away from us.`
- **Metrics**: GLEU: `0.531` | Sim: `0.964` | $F_{0.5}$: `0.238` | Latency: `970ms`

### Example 3 (ID: 19)
- **Source (Input)**: `At the same time, we are prepared to know when there are other members got this disease.`
- **Hypothesis (Output)**: `At the same time, we are prepared to know when other members have this disease.`
- **Reference(s)**: `At the same time, we are prepared to know when there are other members who have got this disease.`
- **Metrics**: GLEU: `0.783` | Sim: `0.974` | $F_{0.5}$: `0.000` | Latency: `891ms`

### Example 4 (ID: 31)
- **Source (Input)**: `This also means that as soon a person is made aware of his or her genetic profile, he or she concurently has a knowledge about others.`
- **Hypothesis (Output)**: `This also means that as soon as a person is made aware of his or her genetic profile, he or she concurrently has knowledge about others.`
- **Reference(s)**: `This also means that as soon as a person is made aware of his or her genetic profile, he or she concurrently has knowledge about others.`
- **Metrics**: GLEU: `1.000` | Sim: `1.000` | $F_{0.5}$: `1.000` | Latency: `933ms`

### Example 5 (ID: 51)
- **Source (Input)**: `Focus on the negative side of the annouance of genetic risk first.`
- **Hypothesis (Output)**: `Focus on the negative side of the announcement of genetic risk first.`
- **Reference(s)**: `I begin by focusing on the negative side of genetic risk first.`
- **Metrics**: GLEU: `0.555` | Sim: `0.917` | $F_{0.5}$: `0.000` | Latency: `776ms`

