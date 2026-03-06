# Alif-Digest Roadmap

Items planned for future development, roughly in priority order.

---

## 🔴 High Priority

### Config pre-flight validation

`alif validate` or an automatic pre-flight check at the start of `alif run` that catches misconfigured/missing API keys, malformed URLs, etc. — before scraping has already happened.

### Expand default keywords

The default keyword list in `default-keywords.ts` is thin. A richer, categorized list (models, research, tools, policy) would meaningfully improve signal quality out of the box.

---

## 🟡 Medium Priority

### `alif history` and `alif status`

- `alif history` — show last N delivered digests from the local DB
- `alif status` — show source health table (last checked, items found, errors)

### `alif run --sequential`

Allow overriding sequential analysis mode per-run from the CLI without editing config.

---

## 🟢 Future Delivery Channels

- **Discord** — dedicated provider for Discord webhook format
- **Telegram** — Telegram Bot API delivery
- **Email** — via SMTP or a transactional email service (Resend, Mailgun)
