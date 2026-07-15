const state = {
  chapters: [],
  artifactTypes: [],
  codex: undefined,
  notebook: "",
  generatedAt: "",
  staticMode: false,
  currentChapterId: "",
  currentType: "study-guide",
  search: "",
  loading: false,
};

const els = {
  chapterCount: document.querySelector("#chapter-count"),
  chapterSearch: document.querySelector("#chapter-search"),
  chapterList: document.querySelector("#chapter-list"),
  chapterKicker: document.querySelector("#chapter-kicker"),
  chapterTitle: document.querySelector("#chapter-title"),
  pageCount: document.querySelector("#page-count"),
  wordCount: document.querySelector("#word-count"),
  artifactCount: document.querySelector("#artifact-count"),
  artifactKicker: document.querySelector("#artifact-kicker"),
  artifactTitle: document.querySelector("#artifact-title"),
  artifactContent: document.querySelector("#artifact-content"),
  cacheBadge: document.querySelector("#cache-badge"),
  selectedArtifactCopy: document.querySelector("#selected-artifact-copy"),
  artifactUseCase: document.querySelector("#artifact-use-case"),
  studyModeList: document.querySelector("#study-mode-list"),
  controlTitle: document.querySelector("#control-title"),
  codexConfig: document.querySelector("#codex-config"),
  artifactCoverage: document.querySelector("#artifact-coverage"),
  dataUpdated: document.querySelector("#data-updated"),
  generateButton: document.querySelector("#generate-button"),
  forceRefresh: document.querySelector("#force-refresh"),
  forceRow: document.querySelector(".force-row"),
  statusLine: document.querySelector("#status-line"),
};

const artifactUseCases = {
  "study-guide": "first-pass understanding",
  briefing: "quick technical review",
  "data-table": "comparing concepts",
  flashcards: "recall practice",
  quiz: "checking weak spots",
  "slide-deck": "visual review or teaching",
};

init();

async function init() {
  setStatus("Loading chapters");
  const data = await loadSiteData();
  state.chapters = data.chapters;
  state.artifactTypes = data.artifactTypes;
  state.codex = data.codex;
  state.notebook = data.notebook || "";
  state.generatedAt = data.generatedAt || "";
  state.staticMode = data.mode === "static";
  state.currentChapterId = state.chapters[0]?.id || "";
  renderAll();
  await loadCachedArtifact();
  setStatus(state.staticMode ? "Static NotebookLM data loaded" : "Idle");
}

async function loadSiteData() {
  try {
    return await fetchJson("data/manifest.json");
  } catch {
    const data = await fetchJson("api/chapters");
    return { ...data, mode: "dynamic" };
  }
}

function renderAll() {
  renderChapters();
  renderHeader();
  renderControls();
}

function renderChapters() {
  els.chapterList.replaceChildren();
  const chapters = filteredChapters();
  els.chapterCount.textContent = `${state.chapters.length} chapters`;

  for (const chapter of chapters) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chapter-button${chapter.id === state.currentChapterId ? " active" : ""}`;
    button.addEventListener("click", async () => {
      state.currentChapterId = chapter.id;
      renderAll();
      await loadCachedArtifact();
    });

    const title = document.createElement("strong");
    title.textContent = `${String(chapter.number).padStart(2, "0")} ${chapter.title}`;
    const meta = document.createElement("span");
    meta.textContent = `${chapter.pageCount} pages · ${formatNumber(chapter.wordCount)} words`;
    button.append(title, meta);
    els.chapterList.append(button);
  }
}

function renderHeader() {
  const chapter = currentChapter();
  if (!chapter) return;
  els.chapterKicker.textContent = `Chapter ${chapter.number}`;
  els.chapterTitle.textContent = chapter.title;
  els.pageCount.textContent = `${chapter.pageCount} pages`;
  els.wordCount.textContent = `${formatNumber(chapter.wordCount)} words`;
  els.artifactCount.textContent = `${Object.keys(chapter.artifacts || {}).length} artifacts`;
}

function renderControls() {
  const chapter = currentChapter();
  const type = currentType();
  const coverage = artifactCoverage();

  els.selectedArtifactCopy.textContent = type?.description || "Choose an artifact type.";
  els.artifactUseCase.textContent = artifactUseCases[type?.id] || "focused review";
  els.artifactCoverage.textContent = `${coverage.available} / ${coverage.total}`;
  els.dataUpdated.textContent = formatDate(state.generatedAt);
  renderStudyModes(chapter);

  if (state.staticMode) {
    els.controlTitle.textContent = "Offline Content";
    els.codexConfig.textContent = `NotebookLM ${state.notebook || "data"} · ${formatDate(state.generatedAt)}`;
    els.generateButton.hidden = true;
    els.forceRow.hidden = true;
    return;
  }
  els.controlTitle.textContent = "Generate";
  els.generateButton.hidden = false;
  els.forceRow.hidden = false;
  els.codexConfig.textContent = state.codex
    ? `Codex ${state.codex.model} · ${state.codex.reasoningEffort}`
    : "Codex model unavailable";
  els.generateButton.disabled = state.loading || !currentChapter() || !type;
}

function renderStudyModes(chapter) {
  els.studyModeList.replaceChildren();
  if (!chapter) {
    const empty = document.createElement("p");
    empty.className = "mode-empty";
    empty.textContent = "Select a chapter before choosing a study mode.";
    els.studyModeList.append(empty);
    return;
  }

  for (const type of state.artifactTypes) {
    const available = Boolean(chapter.artifacts?.[type.id]);
    const active = type.id === state.currentType;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-button${active ? " active" : ""}${available ? " available" : " missing"}`;
    button.setAttribute("aria-pressed", String(active));
    button.disabled = state.staticMode && !available;
    const statusLabel = available ? "Ready" : state.staticMode ? "Missing" : "Generate";
    button.setAttribute("aria-label", `${type.label}: ${type.description} ${statusLabel}.`);

    const copy = document.createElement("span");
    copy.className = "mode-copy";
    const label = document.createElement("strong");
    label.textContent = type.label;
    const description = document.createElement("small");
    description.textContent = type.description;
    copy.append(label, description);

    const status = document.createElement("span");
    status.className = "mode-status";
    status.textContent = statusLabel;
    button.append(copy, status);

    button.addEventListener("click", async () => {
      state.currentType = type.id;
      renderControls();
      await loadCachedArtifact();
    });
    els.studyModeList.append(button);
  }
}

async function loadCachedArtifact() {
  const chapter = currentChapter();
  const type = currentType();
  if (!chapter || !type) return;
  setArtifactShell(type.label, "checking");
  try {
    if (state.staticMode) {
      const artifactPath = chapter.artifacts?.[type.id];
      if (!artifactPath) {
        throw new Error(`No offline ${type.label} has been generated for this chapter.`);
      }
      const artifact = await fetchJson(`data/${artifactPath}`);
      renderArtifact(artifact, "static");
      return;
    }
    const data = await fetchJson(`api/artifact?chapterId=${chapter.id}&type=${type.id}`);
    renderArtifact(data.artifact, "hit");
  } catch (error) {
    setArtifactShell(type.label, "empty");
    setEmpty(error.message || `No cached ${type.label} for this chapter.`);
  }
}

els.chapterSearch.addEventListener("input", () => {
  state.search = els.chapterSearch.value.trim().toLowerCase();
  renderChapters();
});

els.generateButton.addEventListener("click", async () => {
  if (state.staticMode) return;
  const chapter = currentChapter();
  const type = currentType();
  if (!chapter || !type) return;

  state.loading = true;
  renderControls();
  setStatus(`Codex is generating ${type.label}`);
  setArtifactShell(type.label, "running");

  try {
    const data = await fetchJson("api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chapterId: chapter.id,
        type: type.id,
        force: els.forceRefresh.checked,
      }),
    });
    renderArtifact(data.artifact, data.cacheStatus);
    setStatus(data.cacheStatus === "hit" ? "Loaded cached artifact" : "Generated artifact");
  } catch (error) {
    setEmpty(error.message);
    setArtifactShell(type.label, "error");
    setStatus("Generation failed");
  } finally {
    state.loading = false;
    renderControls();
  }
});

function renderArtifact(artifact, cacheStatus) {
  setArtifactShell(artifact.artifactLabel, cacheStatus);
  const content = artifact.content || {};
  els.artifactContent.className = "artifact-content";
  els.artifactContent.replaceChildren();

  if (content.summary) {
    const summary = document.createElement("div");
    summary.className = "summary-box";
    if (content.title) {
      const heading = document.createElement("h4");
      heading.textContent = content.title;
      summary.append(heading);
    }
    const paragraph = document.createElement("p");
    paragraph.textContent = content.summary;
    summary.append(paragraph);
    els.artifactContent.append(summary);
  }

  for (const [key, value] of Object.entries(content)) {
    if (["summary", "items", "sections", "title"].includes(key)) continue;
    els.artifactContent.append(renderValue(titleCase(key), value));
  }

  if (Array.isArray(content.sections) && content.sections.length > 0) {
    const grid = document.createElement("div");
    grid.className = "section-grid";
    for (const section of content.sections) {
      grid.append(renderValue(section.heading || section.title || "Section", section));
    }
    els.artifactContent.append(grid);
  }

  if (Array.isArray(content.items) && content.items.length > 0) {
    const grid = document.createElement("div");
    grid.className = "item-grid";
    for (const item of content.items) {
      grid.append(renderValue(item.title || item.concept || item.front || item.question || "Item", item));
    }
    els.artifactContent.append(grid);
  }

  if (els.artifactContent.children.length === 0) {
    els.artifactContent.append(renderValue(content.title || "Artifact", content));
  }
}

function renderValue(title, value) {
  const card = document.createElement("article");
  card.className = Array.isArray(value) ? "section-card" : "artifact-card";
  const heading = document.createElement("h4");
  heading.textContent = title;
  card.append(heading);

  if (Array.isArray(value)) {
    card.append(renderArray(value));
    return card;
  }

  if (value && typeof value === "object") {
    const primaryList = value.points || value.bullets || value.options;
    if (Array.isArray(primaryList)) {
      card.append(renderArray(primaryList));
    }

    for (const [key, nested] of Object.entries(value)) {
      if (["title", "heading", "points", "bullets", "options"].includes(key)) continue;
      const label = document.createElement("small");
      label.textContent = titleCase(key);
      card.append(label, renderNested(nested));
    }
    return card;
  }

  const paragraph = document.createElement("p");
  paragraph.textContent = stringifyValue(value);
  card.append(paragraph);
  return card;
}

function renderNested(value) {
  if (Array.isArray(value)) {
    return renderArray(value);
  }
  const paragraph = document.createElement("p");
  paragraph.textContent = stringifyValue(value);
  return paragraph;
}

function renderArray(value) {
  const list = document.createElement("ul");
  for (const item of value) {
    const li = document.createElement("li");
    li.textContent = stringifyValue(item);
    list.append(li);
  }
  return list;
}

function setArtifactShell(label, cacheStatus) {
  els.artifactKicker.textContent = currentChapter()?.title || "Artifact";
  els.artifactTitle.textContent = label;
  els.cacheBadge.textContent = cacheStatus;
  els.cacheBadge.className = `cache-badge ${cacheStatus}`;
}

function setEmpty(message) {
  els.artifactContent.className = "artifact-content empty-state";
  els.artifactContent.textContent = message;
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}`);
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data;
}

function filteredChapters() {
  if (!state.search) return state.chapters;
  return state.chapters.filter((chapter) => {
    const haystack = `${chapter.number} ${chapter.title}`.toLowerCase();
    return haystack.includes(state.search);
  });
}

function currentChapter() {
  return state.chapters.find((chapter) => chapter.id === state.currentChapterId);
}

function currentType() {
  return state.artifactTypes.find((type) => type.id === state.currentType);
}

function artifactCoverage() {
  const total = state.chapters.length * state.artifactTypes.length;
  const available = state.chapters.reduce(
    (count, chapter) => count + Object.keys(chapter.artifacts || {}).length,
    0,
  );
  return { available, total };
}

function stringifyValue(value) {
  if (Array.isArray(value)) return value.map(stringifyValue).join("; ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, nested]) => `${titleCase(key)}: ${stringifyValue(nested)}`)
      .join("; ");
  }
  return value == null ? "" : String(value);
}

function titleCase(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value) {
  if (!value) return "not generated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
