# Open-source scope and release checklist

This repository is a standalone Free edition. It is intentionally created without the history of any commercial repository.

## Included

- Local Chrome storage for BYOK settings
- Direct requests to user-selected HTTPS OpenAI-compatible providers
- X/Twitter composer UI, language detection, human-feel prompts, and editable draft insertion
- Local build, package, and public-release guard scripts

## Excluded

- First-party managed-generation service URLs and keys
- Authentication, user accounts, entitlement tokens, subscriptions, payment providers, billing, webhooks, and databases
- Production environment files, deployment configuration, analytics, and private Git history

## Before publishing

1. Run `npm run check:public`.
2. Run `npm run build` and `npm run package`.
3. Inspect `release/` and confirm the ZIP contains no `.env` files, source maps, credentials, or private service code.
4. Review `git status --short` and publish only this new repository, never a copy with commercial history.
5. Create the GitHub repository as public only after the release owner reviews the final diff and package.
