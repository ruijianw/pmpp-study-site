export function markdownReportToArtifactContent(markdown) {
  const articleMarkdown = String(markdown || "").trim();
  const blocks = markdownToBlocks(articleMarkdown);
  const title = blocks.find((block) => block.type === "heading" && block.level === 1)?.text || "Blog Post";
  const summary = blocks.find((block) => block.type === "paragraph")?.text || "";

  return {
    title,
    summary,
    articleMarkdown,
    blocks,
    sections: sectionSummaries(blocks),
    items: [],
  };
}

export function markdownToBlocks(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: cleanInlineMarkdown(heading[2]),
      });
      index += 1;
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ type: "separator" });
      index += 1;
      continue;
    }

    if (isListLine(line)) {
      const items = [];
      while (index < lines.length && isListLine(lines[index].trim())) {
        items.push(cleanInlineMarkdown(lines[index].trim().replace(/^([-*]|\d+[.)])\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (isTableLine(line)) {
      const tableLines = [];
      while (index < lines.length && isTableLine(lines[index].trim())) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const table = parseTable(tableLines);
      if (table) {
        blocks.push(table);
        continue;
      }
    }

    const paragraphLines = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current ||
        /^(#{1,6})\s+/.test(current) ||
        /^(?:-{3,}|\*{3,}|_{3,})$/.test(current) ||
        isListLine(current) ||
        isTableLine(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }
    blocks.push({
      type: "paragraph",
      text: cleanInlineMarkdown(paragraphLines.join(" ")),
    });
  }

  return blocks;
}

function sectionSummaries(blocks) {
  const sections = [];
  let currentSection = null;

  for (const block of blocks) {
    if (block.type === "heading" && block.level > 1) {
      currentSection = { heading: block.text, points: [] };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) continue;
    if (block.type === "paragraph") {
      currentSection.points.push(block.text);
    } else if (block.type === "list") {
      currentSection.points.push(...block.items);
    }
  }

  return sections;
}

function parseTable(lines) {
  const rows = lines
    .filter((line) => !isTableSeparator(line))
    .map((line) => line.split("|").map((cell) => cleanInlineMarkdown(cell.trim())))
    .map((cells) => {
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      return cells;
    })
    .filter((cells) => cells.length > 0);

  if (rows.length < 2) return null;
  return {
    type: "table",
    headers: rows[0],
    rows: rows.slice(1),
  };
}

function isTableLine(line) {
  return line.includes("|") && line.split("|").length >= 3;
}

function isTableSeparator(line) {
  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isListLine(line) {
  return /^([-*]|\d+[.)])\s+/.test(line);
}

function cleanInlineMarkdown(value) {
  return String(value || "")
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
