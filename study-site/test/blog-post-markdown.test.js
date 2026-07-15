import assert from "node:assert/strict";
import { test } from "node:test";

import { markdownReportToArtifactContent } from "../server/blogPostMarkdown.js";

test("converts a Studio blog post markdown report into structured article content", () => {
  const content = markdownReportToArtifactContent(`# GPU Throughput Is a Different Mindset

Modern GPU programming starts by trading single-thread latency for aggregate throughput.

## Why CPU Intuition Breaks

GPUs hide latency by keeping many warps ready to run.

- Expose data parallelism
- Avoid unnecessary synchronization

| Concept | Implication |
| :--- | :--- |
| Warp | Schedule work in groups |
| Coalescing | Align memory access |
`);

  assert.equal(content.title, "GPU Throughput Is a Different Mindset");
  assert.equal(
    content.summary,
    "Modern GPU programming starts by trading single-thread latency for aggregate throughput.",
  );
  assert.equal(content.blocks[0].type, "heading");
  assert.deepEqual(
    content.blocks.find((block) => block.type === "list").items,
    ["Expose data parallelism", "Avoid unnecessary synchronization"],
  );
  assert.deepEqual(content.blocks.find((block) => block.type === "table"), {
    type: "table",
    headers: ["Concept", "Implication"],
    rows: [
      ["Warp", "Schedule work in groups"],
      ["Coalescing", "Align memory access"],
    ],
  });
  assert.deepEqual(content.sections, [
    {
      heading: "Why CPU Intuition Breaks",
      points: [
        "GPUs hide latency by keeping many warps ready to run.",
        "Expose data parallelism",
        "Avoid unnecessary synchronization",
      ],
    },
  ]);
});
