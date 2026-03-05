# 🚀 Alif

**The Autonomous AI Signal Digest CLI.** 

Alif (ألف) scours the web for high-signal AI developments, selects the most relevant breakthroughs using LLMs, and delivers a curated digest directly to your workspace.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

---

## ⚡️ Quick Start

Alif helps you track AI breakthroughs by aggregating and analyzing high-signal sources. Follow these steps to get started:

### 1. Install
```bash
npm install -g .
```

### 2. Setup
Initialize your environment. Alif will guide you through connecting an LLM (Local Ollama, Anthropic, or OpenRouter) and setting up your delivery channels.
```bash
alif init
```

### 3. Run
Generate your daily digest. Alif will scrape all sources, filter the noise, analyze the breakthroughs, and deliver the results.
```bash
alif run
```

### 4. Schedule
Keep the signals flowing by checking for scheduled runs.
```bash
alif schedule add
alif schedule check
```

---

## 🛠 For Tinkers (Customize & Contribute)

Alif is built with extreme modularity. Everything from scrapers to LLM providers follows a strict factory pattern.

### Architecture
- **Inspiration**: Built to solve the "noise" problem in AI news.
- **Persistence**: Local SQLite database handles article deduplication and history.
- **Workflow**: `Scraper` → `Deduplicator` → `Keyword Scorer` → `LLM Analyzer` → `Delivery`.

### Customizing Sources
Your feeds are stored in `~/.config/alif/feeds.json`. You can add any source using the supported types: `rss`, `api`, `json`, or `scrape`.

### Project Structure
- `src/core/scrapers/`: Logic for data ingestion.
- `src/providers/llm/`: Support for Ollama, Anthropic, and OpenRouter.
- `src/providers/delivery/`: Slack Block Kit and generic Webhook support.

### Local Development
```bash
# Install dependencies
npm install

# Run the CLI from source (requires one-time initialization)
npm run dev -- init
npm run dev -- run

# Execute tests
npm run test
```

> [!TIP]
> **Developer Hint**: The CLI looks for configuration in `~/.config/alif/config.json`. If you are running in development, you still need to run `npm run dev -- init` once to generate your local config and database path.

### Troubleshooting Husky (GUI / GitHub Desktop)
If you're using a GUI client like GitHub Desktop on macOS and the pre-commit hooks fail because `npm` or `node` is not found, you need to ensure Husky can find your PATH. 

Run the following in your terminal:
```bash
mkdir -p ~/.config/husky
echo 'export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"' > ~/.config/husky/init.sh
```

### Contributing
1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/amazing-scraper`).
3. Commit your changes (`git commit -m 'Add support for NewsAPI'`).
4. Push to the branch (`git push origin feature/amazing-scraper`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
