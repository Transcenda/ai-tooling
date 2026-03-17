---
description: 'Instructions for using LangChain with Python'
applyTo: "**/*.py"
---

# LangChain Python Instructions

These instructions guide GitHub Copilot in generating code and documentation for LangChain applications in Python.

## Runnable Interface

LangChain's `Runnable` interface is the foundation for composing and executing chains, chat models, output parsers, retrievers, and LangGraph graphs. It provides a unified API for invoking, batching, streaming, inspecting, and composing components.

**Key features:**

- All major LangChain components implement the Runnable interface.
- Supports synchronous (`invoke`, `batch`, `stream`) and asynchronous (`ainvoke`, `abatch`, `astream`) execution.
- Batching is optimized for parallel API calls; set `max_concurrency` in `RunnableConfig` to control parallelism.
- Streaming APIs (`stream`, `astream`, `astream_events`) yield outputs as they are produced.
- Inspect schemas with `get_input_schema`, `get_output_schema` for validation and OpenAPI generation.
- Compose Runnables declaratively with LCEL: `chain = prompt | chat_model | output_parser`.
- Propagate `RunnableConfig` (tags, metadata, callbacks, concurrency) automatically in Python 3.11+; manually in async code for Python 3.9/3.10.
- Create custom runnables with `RunnableLambda` (simple transforms) or `RunnableGenerator` (streaming transforms); avoid subclassing directly.

**Best practices:**

- Use batching for parallel API calls to LLMs or retrievers; set `max_concurrency` to avoid rate limits.
- Prefer streaming APIs for chat UIs and long outputs.
- Always validate input/output schemas for custom chains and deployed endpoints.
- Use tags and metadata in `RunnableConfig` for tracing in LangSmith.
- For custom logic, wrap functions with `RunnableLambda` or `RunnableGenerator` instead of subclassing.

## Chat Models

Use LangChain's chat model integrations for conversational AI:

- Import from `langchain.chat_models` or `langchain_openai` (e.g., `ChatOpenAI`).
- Compose messages using `SystemMessage`, `HumanMessage`, `AIMessage`.
- For tool calling, use `bind_tools(tools)` method.
- For structured outputs, use `with_structured_output(schema)`.

```python
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(model="gpt-4", temperature=0)
messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content="What is LangChain?")
]
response = chat.invoke(messages)
print(response.content)
```

**Standard parameters:**

- `model`: model identifier (e.g., `gpt-4o`, `gpt-3.5-turbo`)
- `temperature`: randomness control (0.0 deterministic — 1.0 creative)
- `timeout`: seconds to wait before canceling
- `max_tokens`: response token limit
- `stop`: stop sequences
- `max_retries`: retry attempts for network/limit failures
- `api_key`, `base_url`: provider auth and endpoint configuration
- `rate_limiter`: optional BaseRateLimiter to space requests

**Tool calling:**

- Register tools with strict input/output typing.
- Observe and log tool call requests and results.
- Validate tool outputs before passing them back to the model.

**Structured outputs:**

Use `with_structured_output` or schema-enforced methods to request JSON or typed outputs. Essential for reliable extraction and downstream processing.

**Context window management:**

- Keep messages concise and prioritize important context.
- Trim old context (summarize or archive) outside the model when it exceeds the window.
- Use a retriever + RAG pattern to surface relevant long-form context.

## Architecture Patterns

- **LLM client factory**: centralize provider configs (API keys), timeouts, retries, and telemetry. Single place to switch providers or client settings.
- **Prompt templates**: store templates under `prompts/` and load via a safe helper. Keep templates small and testable.
- **Chains vs Agents**: prefer Chains for deterministic pipelines (RAG, summarization). Use Agents when you require planning or dynamic tool selection.
- **Tools**: implement typed adapter interfaces; validate inputs and outputs strictly.
- **Memory**: default to stateless design. When memory is needed, store minimal context and document retention/erasure policies.
- **Retrievers**: build retrieval + rerank pipelines. Keep vectorstore schema stable (id, text, metadata).
- **Callbacks & tracing**: use LangChain callbacks and integrate with LangSmith to capture request/response lifecycle.
- **Separation of concerns**: keep prompt construction, LLM wiring, and business logic separate.

## Embeddings & Vectorstores

- Use consistent chunking and metadata fields (source, page, chunk_index).
- Cache embeddings to avoid repeated cost for unchanged documents.
- Local/dev: Chroma or FAISS. Production: Pinecone, Qdrant, Milvus, Weaviate.
- Always initialize vectorstores with a supported embedding model.
- Store documents as LangChain `Document` objects with `page_content` and `metadata`.
- Use `add_documents(documents, ids=...)` to add/update documents. Always provide unique IDs for upserts.
- Use `similarity_search(query, k=4, filter={...})` to retrieve top-k similar documents.

```python
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

embedding_model = OpenAIEmbeddings()
vector_store = InMemoryVectorStore(embedding=embedding_model)

documents = [Document(page_content="LangChain content", metadata={"source": "doc1"})]
vector_store.add_documents(documents=documents, ids=["doc1"])

results = vector_store.similarity_search("What is RAG?", k=2)
for doc in results:
    print(doc.page_content, doc.metadata)
```

## Prompt Engineering & Governance

- Store canonical prompts under `prompts/` and reference them by filename from code.
- Write unit tests that assert required placeholders exist and rendered prompts fit expected patterns.
- Maintain a CHANGELOG for prompt and schema changes that affect behavior.

## Advanced Topics

### Rate-limiting

- Use `rate_limiter` when initializing chat models to space calls.
- Implement retry with exponential backoff and consider fallback models when throttled.

### Caching

- Exact-input caching for conversations is often ineffective. Consider semantic caching (embedding-based) for repeated meaning-level queries.
- Cache only where it reduces cost and meets correctness requirements (e.g., FAQ bots).

## Best Practices

- Use type hints and dataclasses for public APIs.
- Validate inputs before calling LLMs or tools.
- Load secrets from secret managers; never log secrets or unredacted model outputs.
- Deterministic tests: mock LLMs and embedding calls.
- Cache embeddings and frequent retrieval results.
- Observability: log request_id, model name, latency, and sanitized token counts.
- Implement exponential backoff and idempotency for external calls.

## Security & Privacy

- Treat model outputs as untrusted. Sanitize before executing generated code or system commands.
- Validate any user-supplied URLs and inputs to avoid SSRF and injection attacks.
- Document data retention and add an API to erase user data on request.
- Limit stored PII and encrypt sensitive fields at rest.
