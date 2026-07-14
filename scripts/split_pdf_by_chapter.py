#!/usr/bin/env python3
"""Split a PDF into chapter PDFs using its top-level outline bookmarks."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter


def destination_page(reader: PdfReader, item: Any) -> int | None:
    try:
        return reader.get_destination_page_number(item)
    except Exception:
        return None


def destination_title(item: Any) -> str:
    return str(getattr(item, "title", item)).strip()


def first_destination_title(items: list[Any]) -> str | None:
    for item in items:
        if isinstance(item, list):
            title = first_destination_title(item)
            if title:
                return title
        else:
            title = destination_title(item)
            if title:
                return title
    return None


def top_level_outline(reader: PdfReader) -> list[dict[str, Any]]:
    outline = reader.outline
    entries: list[dict[str, Any]] = []
    index = 0

    while index < len(outline):
        item = outline[index]
        if isinstance(item, list):
            index += 1
            continue

        page = destination_page(reader, item)
        if page is None:
            index += 1
            continue

        child_title = None
        if index + 1 < len(outline) and isinstance(outline[index + 1], list):
            child_title = first_destination_title(outline[index + 1])

        entries.append(
            {
                "title": destination_title(item),
                "child_title": child_title,
                "page": page,
            }
        )
        index += 1

    return entries


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return slug or "chapter"


def chapter_display_title(chapter_number: int, entry: dict[str, Any]) -> str:
    child_title = entry.get("child_title")
    if child_title:
        return str(child_title).strip()
    return f"Chapter {chapter_number}"


def chapter_filename(chapter_number: int, title: str) -> str:
    title_without_number = re.sub(rf"^{chapter_number}\s+", "", title).strip()
    slug = slugify(title_without_number)
    return f"chapter-{chapter_number:02d}-{slug}.pdf"


def split_pdf(input_pdf: Path, output_dir: Path, dry_run: bool) -> list[dict[str, Any]]:
    reader = PdfReader(str(input_pdf))
    top_entries = top_level_outline(reader)
    chapters: list[dict[str, Any]] = []

    for idx, entry in enumerate(top_entries):
        match = re.match(r"Chapter-(\d+)", entry["title"])
        if not match:
            continue

        chapter_number = int(match.group(1))
        next_page = len(reader.pages)
        for later_entry in top_entries[idx + 1 :]:
            if later_entry["page"] > entry["page"]:
                next_page = later_entry["page"]
                break

        display_title = chapter_display_title(chapter_number, entry)
        output_path = output_dir / chapter_filename(chapter_number, display_title)
        chapters.append(
            {
                "number": chapter_number,
                "title": display_title,
                "start": entry["page"],
                "end": next_page,
                "output": output_path,
            }
        )

    if not chapters:
        raise SystemExit("No top-level bookmarks matching 'Chapter-N' were found.")

    if dry_run:
        return chapters

    output_dir.mkdir(parents=True, exist_ok=True)
    for chapter in chapters:
        writer = PdfWriter()
        for page_index in range(chapter["start"], chapter["end"]):
            writer.add_page(reader.pages[page_index])

        writer.add_metadata(
            {
                "/Title": chapter["title"],
                "/Source": str(input_pdf),
            }
        )
        with chapter["output"].open("wb") as handle:
            writer.write(handle)

    return chapters


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Split a PDF into chapter PDFs based on top-level Chapter bookmarks."
    )
    parser.add_argument("input_pdf", type=Path, help="Path to the source PDF")
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=Path("output/pdf/chapters"),
        help="Directory for the chapter PDFs",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print detected chapter ranges without writing PDFs",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    chapters = split_pdf(args.input_pdf, args.output_dir, args.dry_run)

    for chapter in chapters:
        page_count = chapter["end"] - chapter["start"]
        print(
            f"Chapter {chapter['number']:02d}: "
            f"pages {chapter['start'] + 1}-{chapter['end']} "
            f"({page_count} pages) -> {chapter['output']}"
        )


if __name__ == "__main__":
    main()
