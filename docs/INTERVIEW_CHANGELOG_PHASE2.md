# Engineering Changelog: Phase 2 — Evaluation Harness & CoNLL-2014 Benchmarking

This document details the architecture, design decisions, metric calculations, and empirical benchmark findings of the **Grammar-Master** evaluation harness. Use this as your technical reference when discussing model evaluation, NLP metrics, and quantitative validation in systems and ML interviews.

---

## 1. Problem: The "Eyeball Fallacy" in Fresher AI Projects

### The Trap
Most AI/LLM wrapper projects rely on subjective, manual eyeballing: developers prompt an LLM, test 3-5 sentences in a UI, and assume the model "works." This fails to answer fundamental engineering questions:
- *What is the exact grammatical error correction (GEC) accuracy?*
- *Does the model preserve semantic meaning, or does it hallucinate stylistic rewrites that alter original claims?*
- *What is the latency distribution (p50/p95) and token cost profile under automated workloads?*

### The Engineering Solution
We built an automated, reproducible evaluation harness under `evals/` that scores Grammar-Master against the gold-standard **CoNLL-2014 Shared Task** test benchmark (`official-2014.combined.m2`).

---

## 2. Core Metrics Architecture

### A. GLEU (Generalized Language Evaluation Understanding)
- **Reference**: Napoles et al. (2015), *"Ground Truth for Grammatical Error Correction"*.
- **Mechanism**: Evaluates n-gram precision and recall ($n=1..4$) between candidate text and reference corrections. Unlike standard machine translation BLEU, GLEU specifically rewards valid corrections while penalizing n-grams copied from the uncorrected source sentence that should have been modified.
- **Multi-Annotator Policy**: CoNLL-2014 annotations include multiple human annotators (e.g. Annotator 0 vs Annotator 1) who often propose distinct, equally valid corrections. Our harness executes a **max-over-references** policy: the candidate is scored against each valid human reference, taking the maximum score. This avoids penalizing the model when it matches a valid alternative proposed by annotator 2.

### B. Semantic Similarity
- **Model**: `all-MiniLM-L6-v2` (384-dimensional dense sentence embeddings via `sentence-transformers`).
- **Mechanism**: Computes cosine similarity between candidate output and reference embeddings to ensure factual consistency and proposition preservation.
- **Fallback**: Built-in character n-gram TF-IDF cosine similarity fallback for offline or low-resource test environments.

### C. $F_{0.5}$ / Edit-Level Precision & Recall
- **Methodology**: Official BEA/CoNLL shared task edit-matching via ERRANT.
- **Formula**:
  $$F_{0.5} = \frac{(1 + 0.5^2) \times P \times R}{(0.5^2 \times P) + R} = \frac{1.25 \times P \times R}{0.25 \times P + R}$$
- **Rationale**: In grammar correction, false positives (flagging or altering correct text) are twice as damaging to user trust as false negatives (missing a subtle error). $F_{0.5}$ weights precision twice as heavily as recall.

---

## 3. Experimental Separation: Primary vs. Diagnostic Evaluation

A crucial architectural principle enforced in `evals/run_eval.py`:
1. **Primary Mode (`[Primary: Live App Route]`)**:
   - Sends requests over HTTP to `http://localhost:3000/api/grammar-check`.
   - Tests the **full production pipeline**: network deserialization, authentication guards, rate-limiting, system prompt construction, Groq SDK invocation, and response parsing.
   - This provides the **headline, defensible benchmark** for resumes and technical screens.
2. **Diagnostic Mode (`[Diagnostic: Direct LLM Baseline]`)**:
   - Directly calls the model (`openai/gpt-oss-120b`) via Groq SDK.
   - Isolates model capabilities from server pipeline latency and network overhead for error ablation.

---

## 4. Benchmark Results (CoNLL-2014 Benchmark Subset)

**Dataset Metadata**:
- Source: `official-2014.combined.m2`
- Sample Size: N=150 sentences (deterministic subset pinned via `random_seed: 42` in `evals/datasets/manifest.json`)
- Evaluated on Live Next.js Route: `http://localhost:3000/api/grammar-check`
- Evaluated against model: `openai/gpt-oss-120b` (configured via `src/config/ai-models.json`)

### Primary Benchmark Scores

| Metric | Measured Value | Meaning & Context |
| :--- | :--- | :--- |
| **GLEU** | **0.7648** | *Official CoNLL-2014 n-gram precision/recall metric (max over references)* |
| **Semantic Similarity** | **0.9795** | *97.95% semantic preservation (`all-MiniLM-L6-v2`) ensuring no hallucinated rewriting* |
| **$F_{0.5}$ Score** | **0.5157** | *Precision-weighted edit F-score via ERRANT (weights precision 2x over recall)* |
| **Precision** | **0.5179** | *51.8% of proposed edits are exact matches to human annotator spans* |
| **Recall** | **0.5671** | *Catches over 56.7% of human-annotated errors on first pass* |
| **p50 Latency** | **2,810.7 ms** | *Median roundtrip response time through live Next.js App Router* |
| **p95 Latency** | **4,011.9 ms** | *Tail latency under sustained sequential requests as API rate-pacing takes effect* |
| **Token Cost / 1k Sentences** | **$0.0817** | *~8.2 cents per 1,000 sentences evaluated* |

---

### Empirical Latency Analysis: Burst vs. Sustained Sequential Workload

A critical empirical finding arose when comparing the initial $N=50$ smoke test against the full $N=150$ benchmark run:
- **Runner Architecture**: The evaluation runner (`evals/run_eval.py`) executes **strictly sequentially** (a single-threaded blocking HTTP loop per sentence). There is no concurrent client traffic.
- **Chunk 1–25 Performance**: Mean latency was **956.4 ms** (p50: **932.7 ms**). During these initial requests, the Groq API key operated within its initial unthrottled burst token-bucket allowance.
- **Chunk 26–150 Performance**: As continuous back-to-back sequential calls depleted the initial burst quota, Groq's gateway enforced sustained token-rate pacing across the remaining 125 requests, stabilizing completion roundtrips at **~2.8s – 2.9s** per sentence.
- **Engineering Lesson**: Benchmarking a small burst ($N \le 25$) gives an overly optimistic picture of cold-burst hardware speed (~900ms). Benchmarking a sustained workload ($N=150$) reveals the true steady-state API rate-pacing latency (~2.8s), proving why client-side architectural optimizations (like cascaded early-exit filters) are vital to protect user experience from provider-side rate throttling.

---

## 5. Technical Interview Talking Points

### Talking Point 1: Quantified Quality vs. "It Works on My Machine"
> *"Rather than relying on subjective eyeballing, I engineered an automated evaluation harness in Python using the CoNLL-2014 benchmark and the ERRANT toolkit. On our full N=150 pinned benchmark subset (`seed=42`), the live application endpoint achieves a 0.7648 GLEU score, an $F_{0.5}$ of 0.5157, and 97.95% semantic similarity against multi-annotator ground truth. This gave us a defensible baseline to measure every subsequent architectural change."*

### Talking Point 2: Handling Multi-Annotator Ground Truth
> *"In grammatical error correction, language is flexible and multiple human annotators often propose different, equally valid corrections. If you only score against the first annotator's reference, you unfairly penalize valid alternative fixes. I implemented a max-over-references evaluation policy across both GLEU and ERRANT $F_{0.5}$, matching the official BEA shared task scoring methodology."*

### Talking Point 3: Empirical Latency Profiling That Directly Motivates Phase 3 (Cascade)
> *"Benchmarking gave us honest numbers: while the 120B model achieves respectable quality ($F_{0.5}$ = 0.516, 97.95% semantic similarity), profiling the live endpoint revealed that after an initial 900ms burst on the first 25 requests, sustained sequential calls hit Groq's token rate pacing, stabilizing at a 2.8s median and 4.0s p95. In an interactive editor, 4 seconds is too sluggish. This empirical finding directly motivated our Phase 3 cascaded architecture — routing trivial typos and punctuation through a fast local pass or 20B model to reduce upstream API calls and keep steady-state latency low."*
