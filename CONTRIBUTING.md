# Contributing to Alif

## 🏗 Architecture

```text
Feeds (81 default sources)
  → Scrapers (RSS, API, JSON, HTML, ArXiv)
    → Exact URI Pruning
      → Layer 1: Positive Keywords - Negative Penalties
        → Top 150 Candidates
          → NLP Deduplicator (Talisman Fuzzy Clustering)
            → Top 25 Candidates
              → Layer 2: LLM Batch Scorer
                → Final Score = (L1 * 0.70) + (L2 * 0.30)
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

## 🤝 How to Contribute

1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/amazing-scraper`).
3. Commit your changes (`git commit -m 'feat: add NewsAPI scraper'`).
4. Push and open a Pull Request.
