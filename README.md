# ai-tooling

> A company-wide collection of AI-powered tools and utilities built **by engineers, for engineers** — supercharging how we write, review, plan, and ship code.

[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/your-org/ai-tooling/pulls)

---

## Why This Exists

We spend a lot of time on repetitive, low-value tasks — copying Jira tickets into documents, context-switching between tools, writing boilerplate. AI can automate most of that.

This repository is our shared space to build, maintain, and improve those automation tools. Everyone on the engineering team is invited to contribute — whether that's a small bug fix, a new feature idea, or an entirely new tool.

**Small contributions compound. Your workflow hack could save every engineer hours per week.**

---

## Tools

| Tool | Description | Status |
|------|-------------|--------|
| [jira-to-md-extension](./jira-to-md-extension/) | Chrome extension that converts Jira tickets into structured Markdown files with one click | ✅ Stable |
| _Your tool here_ | Got a workflow automation idea? [Open an issue](https://github.com/your-org/ai-tooling/issues/new) or submit a PR | 💡 Wanted |

---

## Getting Started

### Jira to Markdown — Chrome Extension

Converts any Jira ticket (classic or modern Atlassian) into a clean Markdown file, ready to paste into docs, PRs, or AI prompts.

**Install (Developer Mode)**

1. Clone this repository:
   ```bash
   git clone https://github.com/your-org/ai-tooling.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `jira-to-md-extension/` folder
5. Navigate to any Jira ticket and click the extension icon

**What it does**

- Extracts ticket title, description, acceptance criteria, assignee, priority, labels, and more
- Converts Jira-flavoured HTML (both classic and modern UI) to clean Markdown
- Lets you **copy to clipboard** or **download as a `.md` file**
- Works on `*.atlassian.net` and self-hosted Jira instances

---

## Contributing

We want this to be a living project. Contributing is easy — even if you've never contributed to an open source project before.

### Ways to Contribute

- **Found a bug?** Open an issue with steps to reproduce
- **Have an idea?** Describe the tool or feature you wish existed
- **Built something useful?** Submit a PR — even rough drafts are welcome
- **Improved an existing tool?** Great, open a PR with a clear description

### Contribution Workflow

1. **Fork** the repository (or clone directly if you have write access)
2. **Create a branch** for your change:
   ```bash
   git checkout -b feat/my-new-tool
   ```
3. **Make your changes** — keep each PR focused on one thing
4. **Test your changes** manually before submitting
5. **Open a Pull Request** with a clear title and description of what the change does and why

### Adding a New Tool

Each tool lives in its own top-level folder:

```
ai-tooling/
├── jira-to-md-extension/   ← existing Chrome extension
├── your-new-tool/          ← add yours here
│   ├── README.md           ← explain what it does and how to use it
│   └── ...
```

There are no strict technology requirements. Use whatever fits the problem — shell scripts, browser extensions, Python scripts, VS Code extensions, etc.

Please include a `README.md` in your tool's folder with:
- What problem it solves
- How to install / run it
- Any known limitations

### Code Style

- Prefer clarity over cleverness — other people will maintain this
- Comment non-obvious logic
- Keep dependencies minimal

---

## Ideas & Roadmap

Not sure what to build? Here are areas where automation would have high impact:

- **PR description generator** — auto-draft PR descriptions from commit history or diff
- **Code review assistant** — summarise large diffs before reviewing
- **Meeting notes formatter** — clean up raw notes into structured action items
- **Ticket estimator** — suggest story points from ticket description
- **Changelog generator** — build release notes from merged PRs
- **Prompt library** — a shared collection of reusable prompts for common dev tasks

Have a different idea? [Open a discussion](https://github.com/your-org/ai-tooling/discussions) or raise it in the team Slack.

---

## Principles

- **Low friction** — tools should require minimal setup to use
- **Composable** — prefer small tools that do one thing well
- **Shared by default** — if it helps you, it probably helps someone else
- **Iterative** — ship early, improve together

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

_Maintained by the engineering team. Everyone is an author here._