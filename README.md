# 🚀 Alif-Digest

**The Autonomous AI Signal Digest CLI.**

Alif (ألف) scours the web for high-signal AI developments, cuts through the noise using a multi-layer scoring system, and delivers a curated daily digest directly to your workspace — powered by your own LLM.

[![npm version](https://img.shields.io/npm/v/alif-digest.svg)](https://www.npmjs.com/package/alif-digest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

---

## ⚡️ Quick Start

### 1. Install

```bash
npm install -g alif-digest
```

### 2. Initialize

Alif will interactively guide you through connecting an LLM (Local Ollama, Anthropic, or OpenRouter) and setting up your delivery channels.

```bash
alif init
```

### 3. Run

Alif scrapes all sources, applies multi-layer scoring, analyzes the top items with your LLM, and delivers the results.

```bash
alif run

# Skip source cooldown (re-fetch all sources immediately)
alif run --force
```

### 4. Schedule

Keep the signals flowing automatically.

```bash
alif schedule add     # Schedule a recurring digest
alif schedule list    # View scheduled jobs
alif schedule check   # Trigger any pending scheduled jobs
```

---

## 🧠 How It Works: Multi-Layer Scoring

Alif uses a two-layer signal detection pipeline to find the articles that matter:

**Layer 1 — Keyword + Consensus + Noise Reduction**
Every article is scored based on:

- **Keyword Matching**: Articles containing high-signal terms (e.g., breakthrough, AGI, o1) are boosted.
- **Consensus Bonus**: If the same story appears across multiple independent feeds, it gets an extra boost (up to +40 points) — a strong signal the internet is talking about it.
- **Negative Penalties**: Articles with low-signal indicators (e.g., "sponsored", "waitlist", "top 10") are penalised automatically.

The top 50 candidates from Layer 1 are passed to Layer 2.

**Layer 2 — AI Article Scoring** _(default: enabled)_
The top 50 candidates are sent as a batch to your configured LLM, which rates each from 0–100 based on genuine novelty and importance.

**Final Score** = Average of Layer 1 and Layer 2. Only articles above your `signalThreshold` are selected, and the top `maxItemsPerRun` are delivered.

---

## 🤖 Models

Use **standard instruction-tuned models** that support structured output. Avoid thinking/reasoning models (e.g. DeepSeek R1, Qwen Thinking variants) as they interfere with JSON schema generation.

### Tested Models

| Provider       | Model                |
| -------------- | -------------------- |
| **Ollama**     | `llama3.2:3b`        |
| **OpenRouter** | `openai/gpt-4o-mini` |

---

## 🛠 CLI Reference

### `alif init`

Interactive wizard to configure your LLM provider, model, delivery channel, and preferences.

### `alif run [--force] [--verbose] [--quiet]`

Run the full pipeline.

- `--force`: Bypass the source cooldown to re-fetch all sources immediately.
- `--verbose`: Stream detailed layer-by-layer scoring and prompt output (great for debugging LLMs).
- `--quiet`: Suppress all output except for errors.

### `alif config`

Manage your configuration without manually editing `config.json`.

```bash
alif config show                          # Print current config
alif config set signalThreshold 70        # Update a preference value
alif config set maxItemsPerRun 5          # Change how many items are delivered
alif config set sequentialAnalysis true   # Enable one-by-one LLM processing
alif config toggle-ai-scoring             # Toggle Layer 2 AI Article Scoring on/off
alif config set logLevel verbose          # Change log verbosity (silent, normal, verbose)
alif config set noColor true              # Disable ANSI colored output
```

### `alif schedule`

```bash
alif schedule add     # Add a new cron schedule
alif schedule list    # List all schedules
alif schedule delete  # Remove a schedule
alif schedule check   # Run any due schedules
```

### `alif debug`

```bash
alif debug llm <provider> --model <name> [--key <api-key>]
# Test your LLM connection and see the full audit trail (prompt, response, latency)

alif debug audit-feeds [--output <path>]
# Scrape all feeds dry-run: see item counts and content sizes per source
# Saves a detailed JSON report (default: ~/.config/alif/audit_report.json)
```

---

## ⚙️ Configuration Reference

Config is stored at `~/.config/alif/config.json`. Most values can be changed with `alif config set`.

| Preference                | Type      | Default    | Description                                                      |
| ------------------------- | --------- | ---------- | ---------------------------------------------------------------- |
| `signalThreshold`         | `number`  | `60`       | Minimum score (0–100) for an article to qualify                  |
| `maxItemsPerRun`          | `number`  | `10`       | Max articles delivered per run                                   |
| `sourceCooldownMinutes`   | `number`  | `5`        | Minimum gap between re-fetching the same source                  |
| `sequentialAnalysis`      | `boolean` | `false`    | Analyze articles one-by-one (recommended for small local models) |
| `enableAIArticlesScoring` | `boolean` | `true`     | Enable Layer 2 LLM-based article scoring                         |
| `customKeywords`          | `object`  | `{}`       | Add or override keyword signal weights                           |
| `negativeKeywords`        | `object`  | `{}`       | Add custom noise/penalty keywords                                |
| `logLevel`                | `string`  | `'normal'` | Set logging verbosity: `'silent'`, `'normal'`, or `'verbose'`    |
| `noColor`                 | `boolean` | `false`    | Disable colored terminal output (`NO_COLOR=1` also works)        |

**Custom keywords example:**

```json
"customKeywords": {
  "my-framework": 30,
  "competitor-name": 0
},
"negativeKeywords": {
  "webinar": 20
}
```

---

## 🏗 Architecture

```
Feeds (81 default sources)
  → Scrapers (RSS, API, JSON, HTML, ArXiv)
    → Deduplicator
      → Layer 1: Keyword Scorer + Consensus Scorer - Negative Scorer
        → Top 50 Candidates
          → Layer 2: LLM Batch Scorer (if enabled)
            → Final Score = avg(L1, L2)
              → LLM Analyzer (summary + category)
                → Delivery (Slack / Webhook)
```

- **Sources**: Configured in `~/.config/alif/feeds.json`
- **History**: Local SQLite database at `~/.config/alif/alif.db`
- **Providers**: `src/providers/llm/` and `src/providers/delivery/`

---

## 🧑‍💻 Local Development

```bash
npm install
npm run dev -- init   # set up your local config
npm run dev -- run    # run from source
npm run test          # run test suite
npm run lint          # lint check
```

> [!TIP]
> Configuration lives at `~/.config/alif/config.json`. You still need to run `npm run dev -- init` once before running from source.

### Troubleshooting Husky (GUI clients)

If pre-commit hooks fail in GitHub Desktop because `npm` is not found:

```bash
mkdir -p ~/.config/husky
echo 'export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"' > ~/.config/husky/init.sh
```

---

## 🤝 Contributing

1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/amazing-scraper`).
3. Commit your changes (`git commit -m 'feat: add NewsAPI scraper'`).
4. Push and open a Pull Request.

---

## 📢 Acknowledgements

Thanks to [Roland](https://github.com/rolandbrecht/) for the initial technical foundation, and [Antigravity](https://antigravity.google/) for the help in building this project.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
