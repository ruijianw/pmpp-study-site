#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import re
import subprocess
import sys
import time
from typing import Any


REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
CHAPTER_MANIFEST_PATH = REPO_ROOT / "output" / "site-data" / "chapters" / "manifest.json"
DEFAULT_OUT_DIR = REPO_ROOT / "output" / "static-site-data"

ARTIFACT_TYPES: list[dict[str, str]] = [
    {
        "id": "study-guide",
        "label": "Study Guide",
        "description": "Learning objectives, key concepts, pitfalls, and a practice plan.",
        "prompt": """Create a compact study guide with:
- 5-8 learning objectives
- a section-by-section chapter map
- key concepts with concise explanations
- common misunderstandings
- a 3-session practice plan""",
    },
    {
        "id": "briefing",
        "label": "Briefing",
        "description": "A concise briefing document for technical review.",
        "prompt": """Create a briefing document with:
- executive summary
- core claims
- why this chapter matters
- prerequisites
- implementation implications""",
    },
    {
        "id": "data-table",
        "label": "Data Table",
        "description": "Structured concept table for comparison and review.",
        "prompt": """Create a structured table. Put rows in items, each with:
- concept
- definition
- cudaRelevance
- performanceConcern
- commonMistake""",
    },
    {
        "id": "flashcards",
        "label": "Flashcards",
        "description": "Question-answer cards for spaced repetition.",
        "prompt": """Create 16-24 flashcards. Put cards in items, each with:
- front
- back
- difficulty: easy, medium, or hard
- sourceHint""",
    },
    {
        "id": "quiz",
        "label": "Quiz",
        "description": "Multiple-choice and short-answer questions with explanations.",
        "prompt": """Create a quiz. Put questions in items:
- 8 multiple-choice questions with four options, answer, and explanation
- 5 short-answer questions with expectedAnswer and explanation
- include a final reviewAdvice section""",
    },
    {
        "id": "slide-deck",
        "label": "Slide Deck",
        "description": "A presentation outline with speaker notes and visual suggestions.",
        "prompt": """Create a slide deck outline with 10-14 slides. Put slides in items, each with:
- slideNumber
- title
- bullets
- speakerNotes
- visualSuggestion""",
    },
]

ARTIFACT_BY_ID = {artifact["id"]: artifact for artifact in ARTIFACT_TYPES}
CHAPTER_ID_PATTERN = re.compile(r"^chapter-\d{2}-[a-z0-9-]+$")


def main() -> int:
    args = parse_args()
    chapter_manifest = read_json(CHAPTER_MANIFEST_PATH)
    chapters = select_chapters(chapter_manifest["chapters"], args.chapters)
    artifact_types = select_artifacts(args.types)
    out_dir = pathlib.Path(args.out_dir).resolve()
    source_map_path = out_dir / "source-map.json"

    source_map = load_source_map(source_map_path)
    if not args.skip_source_refresh:
        source_map = fetch_source_map(args.notebook, chapter_manifest["chapters"], args.profile)
        if not args.dry_run:
            out_dir.mkdir(parents=True, exist_ok=True)
            write_json(source_map_path, source_map)

    existing_artifacts = (
        discover_artifacts(out_dir, chapter_manifest["chapters"]) if out_dir.exists() else {}
    )
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        write_manifest(out_dir, chapter_manifest, args.notebook, source_map, existing_artifacts)

    planned = len(chapters) * len(artifact_types)
    print(f"Notebook: {args.notebook}")
    print(f"Chapters: {len(chapters)}")
    print(f"Artifact types: {', '.join(artifact['id'] for artifact in artifact_types)}")
    print(f"Planned generations: {planned}")

    if args.dry_run:
        for chapter in chapters:
            source = source_map.get(chapter["id"], {})
            for artifact_type in artifact_types:
                print(
                    f"DRY RUN {chapter['id']} -> {artifact_type['id']} "
                    f"(source={source.get('sourceId', 'missing')})"
                )
        return 0

    generated_count = 0
    skipped_count = 0
    errors: list[dict[str, str]] = []
    for chapter in chapters:
        source = source_map.get(chapter["id"])
        if not source or not source.get("sourceId"):
            raise RuntimeError(f"Missing NotebookLM source id for {chapter['id']}")

        for artifact_type in artifact_types:
            artifact_path = static_artifact_path(out_dir, chapter["id"], artifact_type["id"])
            if artifact_path.exists() and not args.force:
                skipped_count += 1
                existing_artifacts.setdefault(chapter["id"], {})[
                    artifact_type["id"]
                ] = static_artifact_relative_path(chapter["id"], artifact_type["id"])
                print(f"SKIP {chapter['id']} {artifact_type['id']} (already exists)")
                continue

            prompt = build_prompt(
                chapter=chapter,
                source=source,
                artifact_type=artifact_type,
                language=args.language,
            )
            print(f"GENERATE {chapter['id']} {artifact_type['id']}")
            try:
                content = generate_content_with_retries(
                    notebook=args.notebook,
                    source_id=source["sourceId"],
                    prompt=prompt,
                    timeout=args.timeout,
                    profile=args.profile,
                    retries=args.retries,
                )
            except Exception as error:
                failure = {
                    "chapterId": chapter["id"],
                    "artifactType": artifact_type["id"],
                    "error": format_error(error),
                }
                if args.continue_on_error:
                    errors.append(failure)
                    print(
                        f"ERROR {failure['chapterId']} {failure['artifactType']}: {failure['error']}",
                        file=sys.stderr,
                    )
                    continue
                raise
            artifact = {
                "chapterId": chapter["id"],
                "chapterTitle": chapter["title"],
                "sourceId": source["sourceId"],
                "sourceTitle": source["sourceTitle"],
                "artifactType": artifact_type["id"],
                "artifactLabel": artifact_type["label"],
                "generatedAt": now_iso(),
                "generator": {
                    "tool": "nlm",
                    "mode": "query",
                    "notebook": args.notebook,
                    "language": args.language,
                },
                "content": content,
            }
            write_json(artifact_path, artifact)
            existing_artifacts.setdefault(chapter["id"], {})[
                artifact_type["id"]
            ] = static_artifact_relative_path(chapter["id"], artifact_type["id"])
            write_manifest(out_dir, chapter_manifest, args.notebook, source_map, existing_artifacts)
            generated_count += 1
            if args.delay > 0:
                time.sleep(args.delay)

    write_manifest(out_dir, chapter_manifest, args.notebook, source_map, existing_artifacts)
    print(f"Done. Generated {generated_count}, skipped {skipped_count}.")
    if errors:
        error_path = out_dir / "errors.json"
        write_json(error_path, errors)
        print(f"Errors: {len(errors)} ({error_path})")
    print(f"Static data: {out_dir}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate offline NotebookLM study artifacts for the static PMPP site."
    )
    parser.add_argument("--notebook", default="pmpp", help="NotebookLM id or nlm alias.")
    parser.add_argument(
        "--chapters",
        default="all",
        help="all, a comma-separated chapter id list, or chapter numbers like 1,2,24.",
    )
    parser.add_argument(
        "--types",
        default="all",
        help="all or comma-separated artifact types: "
        + ",".join(artifact["id"] for artifact in ARTIFACT_TYPES),
    )
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Static data output directory.")
    parser.add_argument("--language", default="zh", help="Generation language hint for NotebookLM.")
    parser.add_argument("--profile", default="", help="Optional nlm auth profile.")
    parser.add_argument("--timeout", type=float, default=180.0, help="nlm query timeout in seconds.")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between nlm calls in seconds.")
    parser.add_argument("--retries", type=int, default=1, help="Retries per artifact after the first attempt.")
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Log failed artifacts and continue the batch.",
    )
    parser.add_argument("--force", action="store_true", help="Regenerate artifacts that already exist.")
    parser.add_argument("--dry-run", action="store_true", help="Print the work plan without generation.")
    parser.add_argument(
        "--skip-source-refresh",
        action="store_true",
        help="Use the existing source-map.json instead of calling nlm source list.",
    )
    return parser.parse_args()


def select_chapters(chapters: list[dict[str, Any]], raw: str) -> list[dict[str, Any]]:
    if raw == "all":
        return chapters

    requested = {part.strip() for part in raw.split(",") if part.strip()}
    selected: list[dict[str, Any]] = []
    for chapter in chapters:
        aliases = {
            str(chapter["number"]),
            f"{chapter['number']:02d}",
            f"chapter-{chapter['number']:02d}",
            chapter["id"],
        }
        if aliases & requested:
            selected.append(chapter)

    missing = requested - {
        alias
        for chapter in selected
        for alias in {
            str(chapter["number"]),
            f"{chapter['number']:02d}",
            f"chapter-{chapter['number']:02d}",
            chapter["id"],
        }
    }
    if missing:
        raise ValueError(f"Unknown chapter selectors: {', '.join(sorted(missing))}")
    return selected


def select_artifacts(raw: str) -> list[dict[str, str]]:
    if raw == "all":
        return ARTIFACT_TYPES
    selected = []
    for artifact_id in [part.strip() for part in raw.split(",") if part.strip()]:
        artifact = ARTIFACT_BY_ID.get(artifact_id)
        if not artifact:
            raise ValueError(f"Unknown artifact type: {artifact_id}")
        selected.append(artifact)
    return selected


def fetch_source_map(
    notebook: str, chapters: list[dict[str, Any]], profile: str
) -> dict[str, dict[str, str]]:
    command = ["nlm", "source", "list", notebook, "--json"]
    if profile:
        command.extend(["--profile", profile])
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    sources = json.loads(result.stdout)
    by_title = {source["title"]: source for source in sources}
    source_map: dict[str, dict[str, str]] = {}
    for chapter in chapters:
        source_title = pathlib.Path(chapter["pdfPath"]).name
        source = by_title.get(source_title)
        if source:
            source_map[chapter["id"]] = {
                "sourceId": source["id"],
                "sourceTitle": source["title"],
            }
    return source_map


def query_nlm(
    notebook: str,
    source_id: str,
    prompt: str,
    timeout: float,
    profile: str,
) -> str:
    command = [
        "nlm",
        "notebook",
        "query",
        "--json",
        "--source-ids",
        source_id,
        "--timeout",
        str(timeout),
    ]
    if profile:
        command.extend(["--profile", profile])
    command.extend([notebook, prompt])
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return extract_answer_text(result.stdout)


def generate_content_with_retries(
    notebook: str,
    source_id: str,
    prompt: str,
    timeout: float,
    profile: str,
    retries: int,
) -> dict[str, Any]:
    last_error: Exception | None = None
    attempts = max(0, retries) + 1
    for attempt in range(1, attempts + 1):
        try:
            answer = query_nlm(
                notebook=notebook,
                source_id=source_id,
                prompt=prompt,
                timeout=timeout,
                profile=profile,
            )
            return extract_json_object(answer)
        except Exception as error:
            last_error = error
            if attempt < attempts:
                print(f"Retry {attempt}/{retries}: {format_error(error)}", file=sys.stderr)
                time.sleep(min(10, 2 * attempt))
    assert last_error is not None
    raise last_error


def format_error(error: Exception) -> str:
    if isinstance(error, subprocess.CalledProcessError):
        detail = (error.stderr or error.stdout or str(error)).strip()
        return detail.splitlines()[-1] if detail else str(error)
    return str(error)


def build_prompt(
    chapter: dict[str, Any],
    source: dict[str, str],
    artifact_type: dict[str, str],
    language: str,
) -> str:
    language_rule = (
        "Write primarily in Chinese. Keep CUDA/GPU terms in English in parentheses where useful."
        if language.startswith("zh")
        else f"Write in {language}."
    )
    return f"""You are generating offline static data for a study website about Programming Massively Parallel Processors.

NotebookLM source scope:
- source id: {source["sourceId"]}
- source title: {source["sourceTitle"]}

Chapter:
- id: {chapter["id"]}
- title: {chapter["title"]}
- pages: {chapter["pageCount"]}
- approximate words: {chapter["wordCount"]}

Artifact requested: {artifact_type["label"]}
{artifact_type["prompt"]}

Rules:
- Use only the scoped NotebookLM source for this chapter.
- Focus on CUDA, GPU architecture, performance reasoning, and implementation mistakes.
- {language_rule}
- Be concise, technical, and useful for fast review.
- Return only valid JSON. Do not wrap it in Markdown fences.
- Use this top-level shape exactly:
{{
  "title": "string",
  "summary": "string",
  "sections": [
    {{"heading": "string", "points": ["string"]}}
  ],
  "items": []
}}
"""


def extract_answer_text(output: str) -> str:
    stripped = output.strip()
    if not stripped:
        raise RuntimeError("nlm returned an empty response")

    try:
        value = json.loads(stripped)
    except json.JSONDecodeError:
        return stripped

    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("answer", "response", "text", "content", "message", "result"):
            candidate = value.get(key)
            if isinstance(candidate, str):
                return candidate
            if isinstance(candidate, (dict, list)):
                return json.dumps(candidate, ensure_ascii=False)
    return json.dumps(value, ensure_ascii=False)


def extract_json_object(text: str) -> dict[str, Any]:
    candidates = [text.strip()]
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced:
        candidates.append(fenced.group(1).strip())
    balanced = first_balanced_object(text)
    if balanced:
        candidates.append(balanced)

    for candidate in candidates:
        try:
            value = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise RuntimeError("Could not parse a JSON object from nlm response")


def first_balanced_object(text: str) -> str:
    start = text.find("{")
    if start == -1:
        return ""
    depth = 0
    in_string = False
    escaped = False
    for index, char in enumerate(text[start:], start=start):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    return ""


def discover_artifacts(
    out_dir: pathlib.Path, chapters: list[dict[str, Any]]
) -> dict[str, dict[str, str]]:
    artifacts: dict[str, dict[str, str]] = {}
    for chapter in chapters:
        chapter_id = chapter["id"]
        chapter_artifacts: dict[str, str] = {}
        for artifact in ARTIFACT_TYPES:
            artifact_path = static_artifact_path(out_dir, chapter_id, artifact["id"])
            if artifact_path.exists():
                chapter_artifacts[artifact["id"]] = static_artifact_relative_path(
                    chapter_id, artifact["id"]
                )
        if chapter_artifacts:
            artifacts[chapter_id] = chapter_artifacts
    return artifacts


def write_manifest(
    out_dir: pathlib.Path,
    chapter_manifest: dict[str, Any],
    notebook: str,
    source_map: dict[str, dict[str, str]],
    artifacts: dict[str, dict[str, str]],
) -> None:
    manifest = {
        "mode": "static",
        "generatedAt": now_iso(),
        "notebook": notebook,
        "generator": {
            "tool": "nlm",
            "mode": "query",
            "sourceScope": "chapter source ids",
        },
        "artifactTypes": ARTIFACT_TYPES,
        "chapters": [],
    }
    for chapter in chapter_manifest["chapters"]:
        source = source_map.get(chapter["id"], {})
        manifest["chapters"].append(
            {
                **chapter,
                "sourceId": source.get("sourceId"),
                "sourceTitle": source.get("sourceTitle"),
                "artifacts": artifacts.get(chapter["id"], {}),
            }
        )
    write_json(out_dir / "manifest.json", manifest)


def static_artifact_relative_path(chapter_id: str, artifact_type: str) -> str:
    assert_chapter_id(chapter_id)
    if artifact_type not in ARTIFACT_BY_ID:
        raise ValueError(f"Unknown artifact type: {artifact_type}")
    return f"artifacts/{chapter_id}/{artifact_type}.json"


def static_artifact_path(out_dir: pathlib.Path, chapter_id: str, artifact_type: str) -> pathlib.Path:
    relative = static_artifact_relative_path(chapter_id, artifact_type)
    path = (out_dir / relative).resolve()
    if not is_relative_to(path, out_dir):
        raise ValueError("Static artifact path escaped output directory")
    return path


def assert_chapter_id(chapter_id: str) -> None:
    if not CHAPTER_ID_PATTERN.match(chapter_id):
        raise ValueError(f"Invalid chapter id: {chapter_id}")


def is_relative_to(path: pathlib.Path, parent: pathlib.Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def load_source_map(path: pathlib.Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    return read_json(path)


def read_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(error.stderr or error.stdout or str(error), file=sys.stderr)
        raise SystemExit(error.returncode)
