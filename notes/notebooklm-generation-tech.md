# NotebookLM Generation Tech Research

Research date: 2026-07-12

## Bottom line

Google's official NotebookLM help pages describe NotebookLM as an AI-powered research assistant that uses Gemini's advanced reasoning and interaction capabilities. The public docs do not name a separate model for each artifact type. Instead, they describe Study Guides, Briefing Documents, Data Tables, Flashcards/Quizzes, and Slide Decks as source-grounded outputs generated in the Studio panel from user-provided sources and instructions.

## Official statements

- [Learn about NotebookLM](https://support.google.com/notebooklm/answer/16164461?hl=en) says NotebookLM is an AI-powered research assistant, uses Gemini's advanced reasoning and interaction capabilities, and can transform sources into formats such as study guides and briefings. Source lines: `L22-L26`.
- [Create a notebook in NotebookLM](https://support.google.com/notebooklm/answer/16206563?hl=en) says the Studio panel is where outputs based on sources are generated. It lists reports, including FAQ, study guide, briefing document, and AI-suggested report types, and it separately lists Data Tables, Flashcards or Quizzes, Slide Decks, and Infographics. Source lines: `L34-L46`.
- [Create & add notes in NotebookLM](https://support.google.com/notebooklm/answer/16262519?hl=en) says you can create a study guide from selected notes, and that data tables in notes export into Google Sheets. Source lines: `L48-L64`.
- [Generate Flashcards or Quizzes in NotebookLM](https://support.google.com/notebooklm/answer/16958963?hl=en) says flashcards and quizzes turn information from your sources into interactive study aids, and that they are generated in the Studio panel. Source lines: `L22-L30`.
- [Generate a Slide Deck in NotebookLM](https://support.google.com/notebooklm/answer/16757456?hl=en) says Slide Decks transform sources into a polished presentation, are generated in Studio, and are AI-generated. Source lines: `L24-L39`.

## Inferred architecture

- The consistent wording across the help pages supports a single NotebookLM generation pipeline in Studio that is Gemini-backed and source-grounded.
- Study Guide, Briefing Document, Data Table, Flashcards/Quizzes, and Slide Deck appear to be output templates or modes of the same system, not separately documented models.
- For Slide Decks, Google documents that they are AI-generated, but I did not find an official source naming the underlying visual model. Any claim that a specific model powers Slide Decks is therefore inference, not an official statement in the sources reviewed.

## What the docs do and do not establish

- Established: NotebookLM is AI-powered, Gemini-capable, and source-grounded.
- Established: The Studio panel generates reports, data tables, flashcards/quizzes, and slide decks from notebook sources.
- Not established in the sources reviewed: a separate, named model for each artifact type.

## URLs reviewed

- https://support.google.com/notebooklm/answer/16164461?hl=en
- https://support.google.com/notebooklm/answer/16206563?hl=en
- https://support.google.com/notebooklm/answer/16262519?hl=en
- https://support.google.com/notebooklm/answer/16958963?hl=en
- https://support.google.com/notebooklm/answer/16757456?hl=en
