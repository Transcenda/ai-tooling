# Python Best Practices for GitHub Copilot

Extracted from [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/main/instructions).

## Files

| File | Description | applyTo |
|------|-------------|---------|
| `copilot-sdk-python.instructions.md` | GitHub Copilot SDK usage — sessions, streaming, custom tools, event handling | `**.py` |
| `langchain-python.instructions.md` | LangChain patterns — Runnable interface, chat models, vectorstores, RAG | `**/*.py` |
| `playwright-python.instructions.md` | Playwright test generation — locators, assertions, fixtures, file structure | `tests/**/*.py` |
| `python-mcp-server.instructions.md` | FastMCP server development — tools, resources, prompts, transport, context | `**/*.py` |

## Usage

Place these `.instructions.md` files in your project's `.github/` folder (or configure in VS Code settings) so GitHub Copilot picks them up automatically when working on Python files.

```
your-project/
└── .github/
    └── copilot-instructions.md   # or individual .instructions.md files
```

Or reference them via `.vscode/settings.json`:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "file": ".github/python-mcp-server.instructions.md" }
  ]
}
```
