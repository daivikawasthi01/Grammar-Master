# Engineering Changelog: Phase 1 — Housecleaning & Systems Hardening

This document records the 5 critical architectural, security, and algorithmic flaws discovered in **Grammar-Master** and how they were resolved. Use this as your reference when discussing codebase debugging, security hardening, and systems judgment in engineering interviews.

---

## 1. Centralized Groq Model Configuration & Verification

### Initial Diagnosis & Root Cause
All 7 AI endpoints (`grammar-check`, `text-check`, `tone-check`, `text-translate`, `synonyms-check`, `ai-text-modify`, `analyze-document`) hardcoded disparate string literals across different routes:
```typescript
model: "openai/gpt-oss-120b"
```
Because this model ID resembled an OpenAI model rather than standard Groq LLaMA models, it was initially suspected during Phase 1 code review to be an invalid/fictitious model ID causing route failures. 

### Phase 2 Empirical Discovery & Addendum
During Phase 2 evaluation benchmarking, rather than assuming standard catalog defaults, we queried the live Groq API key directly via `client.models.list()`. 

The live API returned:
```json
[
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "qwen/qwen3.8-27b",
  "canopylabs/orpheus-v1-english"
]
```
Querying standard catalog models like `llama-3.3-70b-versatile` actually returned `404: model not found` on this specific Groq environment. In reality, Groq hosts open-weight OSS architectures (`openai/gpt-oss-120b` for 120B reasoning and `openai/gpt-oss-20b` for 20B fast inference) for this tier. 

The true architectural flaw was **string fragmentation across routes without validation or fallback**, meaning any future model migration or deprecation would require touching 7 separate route files with no type safety.

### Engineering Fix
- Created `src/config/ai-models.json` as a single, language-agnostic source of truth:
  - `"PRIMARY": "openai/gpt-oss-120b"`: Configured for primary grammar correction and tone adjustment routes.
  - `"FAST": "openai/gpt-oss-20b"`: Configured for lightweight completions like synonym lookups and triage.
- Bound this into `src/lib/ai-config.ts` (`GROQ_MODELS`) with typed exports and a shared singleton `getGroqClient()` with proper API key validation.
- Replaced hardcoded strings across all routes with typed configuration imports, ensuring both the TypeScript Next.js application and the Python evaluation harness (`evals/run_eval.py`) consume the exact same verified models.

### Interview Talking Point
> *"I initially suspected `openai/gpt-oss-120b` was an invalid model ID. But during Phase 2, rather than guessing, I queried the live Groq endpoint via `client.models.list()`, discovering that this account specifically provisioned `openai/gpt-oss-120b` and `openai/gpt-oss-20b`, while standard catalog IDs returned 404. I extracted the model mapping into a version-controlled `src/config/ai-models.json` file shared between our Next.js backend and our Python evaluation harness, eliminating cross-language drift and string fragmentation across route handlers."*

---

## 2. Broken API Authentication & Insecure Direct Object Reference (IDOR)

### Root Cause
The Next.js middleware only checked route prefixes (`/account/*`), while all `/api/*` endpoints accepted an unverified client-supplied `_id` parameter from `req.json()`:
```typescript
// BEFORE: Dangerous anti-pattern in API routes
const { text, _id } = await req.json();
await User.findByIdAndUpdate({ _id: _id }, { prompts: user.prompts + 1 });
```
An attacker could simply send any valid MongoDB `_id` in the JSON payload to consume another user's prompt quota, overwrite their documents via `/api/save-document`, or read arbitrary documents via `/api/document/[_id]/[document_id]`.

### Engineering Fix
- Implemented `src/lib/api-auth.ts` (`authenticateApiRequest` and `requireAuthOrDemo`):
  - Extracts and verifies the cryptographic signature of the `token` JWT cookie set at login.
  - Strictly derives `userId` from the verified JWT payload, ignoring untrusted client-supplied IDs.
  - **Hardened Demo Mode Isolation**: Demo sessions (`demo123`) are strictly env-gated (blocked in production unless `ALLOW_DEMO_MODE=true`), restricted to synthetic memory buffers, and strictly blocked from querying or mutating real MongoDB `ObjectId` records.
  - Added unit test suite `src/lib/api-auth.test.ts` verifying JWT extraction, IDOR attack rejection, and environment gating.

### Interview Talking Point
> *"The backend trusted the client-supplied user ID in the request body, introducing an Insecure Direct Object Reference (IDOR) where any user could drain another user's rate limits or mutate their documents. I built a server-side authentication guard (`api-auth.ts`) that verifies the signed httpOnly JWT cookie, derives user identity strictly from cryptographic session claims, and isolates non-production demo sessions so they cannot touch production MongoDB records."*

---

## 3. Duplicate Mongoose Schema Collisions

### Root Cause
The repository maintained two diverging User models:
1. `src/models/User.ts`: Minimal schema (`email`, `password`) used by `src/lib/auth.ts`.
2. `src/app/db/schema.ts`: Full schema (`name`, `plan`, `prompts`, `documents`, `trashs`, `password: { select: false }`) used by API routes.

Mongoose registers models globally on `mongoose.models.User`. Depending on which file was imported first by a serverless function or hot-reload event, Mongoose would either throw a `Cannot overwrite Model once compiled` error or bind the wrong schema shape, causing silent field omissions (e.g. `prompts` or `documents` missing on retrieved records).

### Engineering Fix
- Designated `src/app/db/schema.ts` as the canonical schema definition with defensive field defaults (`prompts: 0`, `plan: 'free'`, `documents: []`).
- Updated `src/models/User.ts` to directly re-export `User` from `@/app/db/schema`.
- Updated `src/lib/auth.ts` to use canonical `User` and explicitly include `.select('+password')` to handle authentication safely.

### Interview Talking Point
> *"Because Next.js route handlers compile independently, having two separate Mongoose schemas registering under `User` created race conditions and schema collisions during cold starts. I unified the data layer into a single canonical schema with defensive defaults and updated NextAuth credential lookups to explicitly project hidden password hashes."*

---

## 4. Corruptive Text Slicing, Span Overwrites & DOM Duplication

### Root Cause
Three distinct text-corruption bugs existed in the editor and translation pipeline:
1. **Global First-Match Replacement**: In `page.tsx`, `cleanText.replace(sug.originalText, sug.replacementText)` was used. If a typo or word appeared multiple times, `replace` always replaced the *first* occurrence in the document, corrupting unrelated text while leaving the targeted typo intact.
2. **Highlight Span Loop Wipe**: In `TextEditor.tsx`, `suggestions.forEach` reassigned `processedText = cleanText.slice(...)` on each iteration, overwriting previous spans so only the final suggestion was highlighted.
3. **Translation Node Multiplication**: In `TranslateText.ts`, `tempDiv.childNodes.map(...)` replaced every individual `TEXT_NODE` with the complete translation string, duplicating the entire translated text multiple times across paragraphs.

### Engineering Fix
- Updated `analyze-document` suggestions to compute and return precise character index boundaries (`startIndex`, `endIndex`).
- Refactored `handleApplySuggestion` in `page.tsx` to slice by index bounds (`cleanText.slice(0, startIndex) + replacement + cleanText.slice(endIndex)`), preserving duplicate words elsewhere.
- Refactored `TextEditor.tsx` to sort suggestion offsets in descending order and inject HTML highlight spans from right-to-left, ensuring earlier character offsets remain unaffected.
- Fixed `TranslateText.ts` to set the translated text directly rather than multiplying it over child nodes.

### Interview Talking Point
> *"A subtle bug in string replacement occurred when suggestions were applied via `String.prototype.replace()`, which naively replaces the first occurrence in the document rather than the specific instance the user clicked. I overhauled the suggestion pipeline to pass exact character offsets (`startIndex`, `endIndex`) and implemented offset-based slice replacement, sorting spans descending by offset to prevent index drift during multi-span injection."*

---

## 5. Naive & Unscientific NLP Heuristics

### Root Cause
`CalculateTextMetrics.ts` contained heuristics that produced wildly incorrect scores:
1. **The 70-Word Dictionary Trap**: `calculateSpellingScore` checked words against a hardcoded set of ~70 common words. Any standard English vocabulary word (such as "software", "engineering", "student", "architecture") was marked as a spelling mistake, dropping the spelling score to near zero for well-written essays.
2. **False Passive Voice Penalties**: The passive voice regex was `(am|is|are|was|were)\s+\w+ing`. This matches continuous/progressive aspect (*"I am writing"*, *"we were developing"*), NOT passive voice! Normal active sentences were being penalized for passive voice.
3. **Blanket Confusable Penalties**: `(their|there|they're|your|you're)` was penalized on sight, regardless of whether usage was grammatically correct.

### Engineering Fix
- Overhauled `CalculateTextMetrics.ts`:
  - Replaced the 70-word check with targeted heuristics: checking a curated list of high-frequency typos, impossible consonant clusters (5+ consecutive consonants), and 3+ identical consecutive characters.
  - Rewrote passive voice detection to require auxiliary 'be' + past participles (`-ed`, `-en`, or irregular participles like `built`, `written`, `made`).
  - Added unit test coverage in `src/lib/nlp-metrics.test.ts` verifying that standard vocabulary is not penalized and continuous aspect is cleanly distinguished from passive voice.

### Interview Talking Point
> *"The project's original readability and grammar heuristics had severe false-positive rates: standard continuous tenses like 'I am writing' were penalized as passive voice via a flawed regex, and standard vocabulary was flagged as spelling errors against a 70-word list. I re-engineered the heuristics to look for true passive participle constructions and structural character patterns, backed by automated unit tests."*
