---
description: 'Instructions for building MCP servers in Python using FastMCP'
applyTo: "**/*.py"
---

# Python MCP Server Development Guide

## Setup

Use `uv` for project management:

```bash
uv init mcp-server-demo
uv add "mcp[cli]"
```

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("My Server")
```

**Type hints are mandatory** — they drive schema generation and validation throughout the framework.

## Core Decorators

### Tools

```python
@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b
```

### Resources

```python
@mcp.resource("config://app")
def get_config() -> str:
    """Get application configuration"""
    return "debug=true"
```

### Prompts

```python
@mcp.prompt()
def review_code(code: str) -> str:
    return f"Please review this code:\n\n{code}"
```

## Structured Output

Use Pydantic models, TypedDicts, or dataclasses for machine-readable outputs:

```python
from pydantic import BaseModel

class WeatherResult(BaseModel):
    temperature: float
    condition: str
    city: str

@mcp.tool()
def get_weather(city: str) -> WeatherResult:
    return WeatherResult(temperature=72.0, condition="sunny", city=city)
```

## Transport Options

### stdio (default — for CLI integration)

```python
if __name__ == "__main__":
    mcp.run()
```

### HTTP Server

```python
if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

### Integration with FastAPI/Starlette

```python
from starlette.applications import Starlette
app = mcp.get_asgi_app()
```

## Context and Advanced Features

Tools can access MCP capabilities through a `Context` parameter:

```python
from mcp.server.fastmcp import Context

@mcp.tool()
async def process_data(data: str, ctx: Context) -> str:
    await ctx.info(f"Processing {len(data)} bytes")
    await ctx.report_progress(0, 100)

    # Request additional info from user
    clarification = await ctx.elicit("What format do you need?")

    # Sample from LLM
    result = await ctx.session.create_message(
        messages=[{"role": "user", "content": data}],
        max_tokens=100
    )

    await ctx.report_progress(100, 100)
    return result.content.text
```

**Available context methods:**
- `await ctx.debug(msg)` — debug logging
- `await ctx.info(msg)` — info logging
- `await ctx.warning(msg)` — warning logging
- `await ctx.error(msg)` — error logging
- `await ctx.report_progress(current, total)` — progress reporting
- `await ctx.elicit(message)` — request user input
- `await ctx.session.create_message(...)` — LLM sampling

## Image Handling

```python
from mcp.server.fastmcp import Image

@mcp.tool()
def capture_screenshot() -> Image:
    return Image(path="screenshot.png")
```

## Resource Lifecycle Management

Use lifespan context managers for setup/teardown:

```python
from contextlib import asynccontextmanager
from mcp.server.fastmcp import FastMCP

@asynccontextmanager
async def lifespan(server):
    # Startup
    db = await connect_db()
    yield {"db": db}
    # Cleanup
    await db.close()

mcp = FastMCP("My Server", lifespan=lifespan)

@mcp.tool()
async def query(sql: str, ctx: Context) -> list:
    db = ctx.request_context.lifespan_context["db"]
    return await db.fetch(sql)
```

## Error Handling

```python
@mcp.tool()
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```

## Best Practices

1. **Type hints everywhere** — required for schema generation
2. **Return structured outputs** — use Pydantic models or dataclasses
3. **Use async functions for I/O** — don't block the event loop
4. **Clean up resources** — use lifespan context managers
5. **Focus on single responsibility** — each tool should do one thing
6. **Comprehensive error handling** — raise meaningful exceptions
7. **Test independently before LLM integration** — use the MCP Inspector

## Testing

```bash
# Test with MCP Inspector (interactive debugging)
uv run mcp dev server.py

# Install into Claude Desktop
uv run mcp install server.py
```

## Security Considerations

- Validate all file paths before access; use `pathlib.Path` and check against allowed directories
- Sanitize network request URLs to prevent SSRF
- Limit resource access to necessary directories/endpoints only
- Never expose secrets or credentials through tool outputs
