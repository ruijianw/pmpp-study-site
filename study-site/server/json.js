export function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Codex returned an empty response");
  }

  for (const candidate of candidates(trimmed)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next extraction strategy.
    }
  }

  throw new Error("Could not parse a JSON object from Codex response");
}

function candidates(text) {
  const values = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    values.push(fenced[1].trim());
  }
  const balanced = firstBalancedObject(text);
  if (balanced) {
    values.push(balanced);
  }
  return values;
}

function firstBalancedObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return text.slice(start, index + 1);
    }
  }
  return "";
}
