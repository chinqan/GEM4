---
inclusion: always
---

# Graphify Action Plan Rules

When working with Graphify reports, especially `graphify-out/GRAPH_REPORT.md`, the assistant must generate Traditional Chinese analysis and solution-oriented action plans.

This steering file complements `.kiro/steering/graphify.md`.

---

## Language Rules

When summarizing, explaining, or generating Graphify-related reports:

- Use Traditional Chinese.
- Keep technical identifiers in their original form.
- Do not translate:
  - file paths
  - filenames
  - class names
  - function names
  - method names
  - API routes
  - database table names
  - environment variables
  - package names
- Explain architecture, risks, and solutions in Traditional Chinese.

---

## Suggested Questions Handling

When `graphify-out/GRAPH_REPORT.md` contains a `Suggested Questions` section, do not only repeat or list the questions.

The assistant must answer all Suggested Questions in one pass and produce a solution-oriented action plan.

For each Suggested Question:

1. Restate the question in Traditional Chinese.
2. Explain what architectural or dependency issue the question is trying to reveal.
3. Answer the question based on:
   - `graphify-out/GRAPH_REPORT.md`
   - `graphify-out/graph.json`
   - related nodes
   - related edges
   - `source_file`
   - `source_location`
4. Identify affected modules, files, or concepts.
5. Assess risk level:
   - High
   - Medium
   - Low
6. Explain the root cause.
7. Propose a concrete solution.
8. List recommended files to inspect or modify.
9. Provide validation steps.
10. Mark confidence level:
   - High
   - Medium
   - Low

---

## Required Output

When asked to process Graphify Suggested Questions, generate or update:

```text
graphify-out/GRAPH_ACTION_PLAN.zh-TW.md