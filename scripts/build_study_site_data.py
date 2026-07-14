#!/usr/bin/env python3
"""Build chapter text files and manifest data for the local study site."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF_DIR = ROOT / "output" / "pdf" / "chapters"
DEFAULT_OUT_DIR = ROOT / "output" / "site-data" / "chapters"


@dataclass(frozen=True)
class ChapterEntry:
    id: str
    number: int
    title: str
    pdfPath: str
    textPath: str
    pageCount: int
    wordCount: int


def title_from_stem(stem: str) -> tuple[int, str]:
    match = re.fullmatch(r"chapter-(\d+)-(.+)", stem)
    if not match:
        raise ValueError(f"Unexpected chapter filename: {stem}")
    number = int(match.group(1))
    title = match.group(2).replace("-", " ").strip().title()
    return number, title


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_text(pdf_path: Path) -> tuple[str, int]:
    reader = PdfReader(str(pdf_path))
    pages: list[str] = []
    for index, page in enumerate(reader.pages, start=1):
        text = normalize_text(page.extract_text() or "")
        pages.append(f"--- Page {index} ---\n{text}")
    return "\n\n".join(pages).strip() + "\n", len(reader.pages)


def build_manifest(pdf_dir: Path, out_dir: Path) -> dict[str, list[dict[str, object]]]:
    if not pdf_dir.exists():
        raise FileNotFoundError(f"Chapter PDF directory does not exist: {pdf_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)
    chapters: list[ChapterEntry] = []

    for pdf_path in sorted(pdf_dir.glob("chapter-*.pdf")):
        number, title = title_from_stem(pdf_path.stem)
        text, page_count = extract_pdf_text(pdf_path)
        text_path = out_dir / f"{pdf_path.stem}.txt"
        text_path.write_text(text, encoding="utf-8")
        chapters.append(
            ChapterEntry(
                id=pdf_path.stem,
                number=number,
                title=title,
                pdfPath=str(pdf_path.relative_to(ROOT)),
                textPath=str(text_path.relative_to(ROOT)),
                pageCount=page_count,
                wordCount=len(re.findall(r"\S+", text)),
            )
        )

    manifest = {"chapters": [asdict(chapter) for chapter in chapters]}
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf-dir", type=Path, default=DEFAULT_PDF_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()

    manifest = build_manifest(args.pdf_dir.resolve(), args.out_dir.resolve())
    print(f"Wrote {len(manifest['chapters'])} chapters to {args.out_dir}")


if __name__ == "__main__":
    main()
