---
inclusion: always
---

## graphify

A knowledge graph of this project lives in `graphify-out/`. It is the primary navigation tool for understanding architecture, tracing dependencies, and finding connections.

### Before answering architecture or dependency questions

1. If `graphify-out/GRAPH_REPORT.md` exists, read it first — it contains god nodes, community structure, surprising connections, and suggested questions.
2. Use the graph structure (god nodes, communities, edges) to navigate instead of grepping raw files.
3. If the graph is stale (code has changed significantly since last build), suggest running `/graphify . --update`.

### After making code changes

When you finish a coding task that adds, removes, or significantly modifies source files:
- Mention that the graph may need updating: "Run `/graphify . --update` to refresh the knowledge graph."
- For code-only changes, the update is free (AST only, no LLM tokens).

### Query patterns

- Use `/graphify query "<question>"` for broad context (BFS traversal).
- Use `/graphify query "<question>" --dfs` to trace a specific dependency chain.
- Use `/graphify path "A" "B"` to find shortest path between two concepts.
- Use `/graphify explain "NodeName"` for a plain-language explanation of any node.

### Graph-first navigation

When asked about how modules connect, what depends on what, or where something is used:
1. Check `graphify-out/graph.json` god nodes and community structure first.
2. Follow edges from the graph rather than scanning files manually.
3. Cite source_file and source_location from graph nodes when referencing specific code.

For Traditional Chinese summaries and Suggested Questions action plans, also follow `.kiro/steering/graphify-action-plan.md`.

### When to trigger the Action Plan

After a **full** `/graphify` run (not `--update`) that produces new Suggested Questions:
- Inform the user: "GRAPH_REPORT.md 包含新的 Suggested Questions。使用 `#graphify-action-plan` 可產出完整的繁體中文行動計畫。"
- If the user explicitly asks for analysis or action plan, activate the action-plan steering rules.