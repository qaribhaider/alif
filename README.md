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

## ✨ Features

- **Multi-Layer AI Scoring**: Specialized two-stage evaluation engine combining keyword heuristics and deep NLP analysis to surface truly important signals.
- **Smart Deduplication**: Blazing-fast fuzzy clustering ensures you never read three variations of the same news story.
- **Aggressive Noise Reduction**: Automatically downranks PR pieces, sponsored fluff, and empty listicles.
- **Broad Content Ingestion**: Seamlessly scrapes various RSS, JSON API, raw HTML, and ArXiv feeds.
- **Customizable Delivery**: Push your personalized daily digests directly to Slack or any Webhook.
- **Bring Your Own AI**: Works out-of-the-box with local Ollama models or cloud providers like OpenRouter.
- **Built-in Automation**: Schedule recurring digests to keep your feeds curated entirely on autopilot.

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

## 🤝 Architecture & Contributing

Interested in how Alif works under the hood or want to run it locally?

Check out our [**Contributing Guidelines**](CONTRIBUTING.md) for information on the architecture, local development setup, and how to submit pull requests!

---

## 📢 Acknowledgements

Thanks to [Roland](https://github.com/rolandbrecht/) for the initial technical foundation, and [Antigravity](https://antigravity.google/) for the help in building this project.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
