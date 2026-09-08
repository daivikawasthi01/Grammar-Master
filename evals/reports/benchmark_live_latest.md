# Grammar-Master Benchmark Report

**Mode**: `Primary [Live App Route: http://localhost:3000/api/grammar-check]`  
**Evaluated on**: N=30 sentences, seed=42, from CoNLL-2014 test set (`conll2014_subset.jsonl`)  
**Generated**: 2026-09-08T11:54:19.122615

---

## 1. Executive Summary

| Metric | Score | Industry Benchmark Context |
| :--- | :--- | :--- |
| **GLEU** | **0.7034** | *Official CoNLL-2014 n-gram precision/recall metric (max over references)* |
| **Semantic Similarity** | **0.9613** | *Cosine embedding similarity (`all-MiniLM-L6-v2`) measuring meaning preservation* |
| **$F_0.5$ Score** | **0.3326** | *Precision-weighted edit F-score (ERRANT methodology)* |
| **Precision** | **0.3286** | *Ratio of proposed edits that were legitimate corrections* |
| **Recall** | **0.3706** | *Ratio of reference errors successfully identified and fixed* |

---

## 2. Latency & Systems Performance

| Latency Metric | Milliseconds |
| :--- | :--- |
| **p50 (Median)** | **788.3 ms** |
| **p95** | **1094.7 ms** |
| **Mean** | **571.1 ms** |
| **Min / Max** | **0.0 ms / 1125.1 ms** |

---

## 3. Token Economics & Throughput

| Resource | Count / Cost |
| :--- | :--- |
| **Total Prompt Tokens** | 2,006 |
| **Total Completion Tokens** | 477 |
| **Total Tokens** | 2,483 |
| **Estimated Evaluation Cost** | $0.00156 |
| **Estimated Cost / 1,000 Sentences** | **$0.0520** |

---

## 4. Qualitative Sample Inspections

### Example 1 (ID: 3)
- **Source (Input)**: `People get certain disease because of genetic changes.`
- **Hypothesis (Output)**: `People get certain diseases because of genetic changes.`
- **Reference(s)**: `People get certain diseases because of genetic changes.`
- **Metrics**: GLEU: `1.000` | Sim: `1.000` | $F_{0.5}$: `1.000` | Latency: `776ms`

### Example 2 (ID: 12)
- **Source (Input)**: `When people around us know that we got certain disease, their altitudes will be easily changed, whether caring us too much or keeping away from us.`
- **Hypothesis (Output)**: `When people around us know that we have a certain disease, their attitudes will be easily changed, whether they care for us too much or keep away from us.`
- **Reference(s)**: `When people around us know that we have certain diseases, their attitude will easily change, whether caring for us too much or keeping away from us.`
- **Metrics**: GLEU: `0.509` | Sim: `0.978` | $F_{0.5}$: `0.385` | Latency: `1102ms`

### Example 3 (ID: 19)
- **Source (Input)**: `At the same time, we are prepared to know when there are other members got this disease.`
- **Hypothesis (Output)**: `At the same time, we are prepared to know when there are other members who have this disease.`
- **Reference(s)**: `At the same time, we are prepared to know when there are other members who have got this disease.`
- **Metrics**: GLEU: `0.921` | Sim: `0.991` | $F_{0.5}$: `0.000` | Latency: `786ms`

### Example 4 (ID: 31)
- **Source (Input)**: `This also means that as soon a person is made aware of his or her genetic profile, he or she concurently has a knowledge about others.`
- **Hypothesis (Output)**: `This also means that as soon as a person is made aware of his or her genetic profile, he or she concurrently has knowledge about others.`
- **Reference(s)**: `This also means that as soon as a person is made aware of his or her genetic profile, he or she concurrently has knowledge about others.`
- **Metrics**: GLEU: `1.000` | Sim: `1.000` | $F_{0.5}$: `1.000` | Latency: `937ms`

### Example 5 (ID: 51)
- **Source (Input)**: `Focus on the negative side of the annouance of genetic risk first.`
- **Hypothesis (Output)**: `Focus on the negative side of the announcement of genetic risk first.`
- **Reference(s)**: `I begin by focusing on the negative side of genetic risk first.`
- **Metrics**: GLEU: `0.555` | Sim: `0.917` | $F_{0.5}$: `0.000` | Latency: `793ms`

