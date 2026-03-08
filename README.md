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

### `alif validate`

Runs a strict pre-flight check on your `config.json` and `feeds.json` files. It verifies that your Cloud LLM API keys are present (if selected), that Delivery Webhook URLs are valid HTTP destinations, and that the `feeds.json` array exists and contains the correct format schema.

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

## ☁️ Running on GitHub Actions (Free)

To ensure your API keys and workflow logs remain completely secure and hidden from the public, we highly recommend running this in a **Private** GitHub repository.

1. **Create a new Private Repository** on GitHub.
2. **Copy the example workflow:** Copy the [`examples/alif-scheduled-run.yml`](./examples/alif-scheduled-run.yml) file into your new private repository at `.github/workflows/alif-scheduled-run.yml`.
3. Navigate to your private repository's **Settings > Secrets and variables > Actions**.
4. Add your sensitive access credentials as **Repository Secrets**.
5. Configure your preferences as **Repository Variables** (optional).

### Environment Variables Reference

| Variable                       | Type     | Possible Values                           | Default             | Description                                                                   |
| ------------------------------ | -------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `ALIF_LLM_PROVIDER`            | Variable | `'anthropic'`, `'openrouter'`, `'ollama'` | `'anthropic'`       | The AI provider to use for analysis.                                          |
| `ALIF_LLM_API_KEY`             | Secret   | _Your API Key_                            | -                   | Universal key. Alternatively use `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`. |
| `ALIF_LLM_MODEL`               | Variable | e.g. `'claude-3-5-sonnet-20240620'`       | _Provider Specific_ | The specific model to use.                                                    |
| `SLACK_WEBHOOK_URL`            | Secret   | *https://hooks.slack.com/...*             | -                   | Webhook URL for Slack delivery.                                               |
| `GENERIC_WEBHOOK_URL`          | Secret   | _https://..._                             | -                   | Webhook URL for generic server delivery.                                      |
| `ALIF_SIGNAL_THRESHOLD`        | Variable | `0` - `100`                               | `60`                | Minimum score for an article to qualify.                                      |
| `ALIF_MAX_ITEMS_PER_RUN`       | Variable | `1`+                                      | `10`                | Max articles delivered per run.                                               |
| `ALIF_SOURCE_COOLDOWN_MINUTES` | Variable | `0`+                                      | `5`                 | Minimum gap between re-fetching a source.                                     |

The included workflow automatically runs every day at 8:00 AM UTC (you can change the schedule in the file), caches your database state securely, and delivers your customized digest!

---

## 🤝 Architecture & Contributing

Interested in how Alif works under the hood or want to run it locally?

Check out our [**Contributing Guidelines**](https://github.com/qaribhaider/alif/blob/main/CONTRIBUTING.md) for information on the architecture, local development setup, and how to submit pull requests!

---

## 📢 Acknowledgements

Thanks to [Roland](https://github.com/rolandbrecht/) for the initial technical foundation, and [Antigravity](https://antigravity.google/) for the help in building this project.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
