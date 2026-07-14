# NotebookLM API Research

Research date: 2026-07-12

## Official API status

I found no official public NotebookLM API, SDK, or developer endpoint documented in Google’s NotebookLM Help Center, Google Workspace pages, or official Google blog/developer materials I reviewed. The documented workflow is manual use of the web app, with some automatic sync behavior for Google Drive sources. That means any browser scripting or UI automation would be an unsupported workaround, not an official integration.

## Supported manual import sources/formats

Officially documented source types include:

- Audio files, including MP3 and WAV
- Copy/pasted text
- Google Drive files, including Google Docs, Google Slides, and Google Sheets
- Google Docs, Google Slides, and Google Sheets directly
- Images in specific formats listed by Google
- DOCX, TXT, MD, PDF, CSV, and PPTX files
- Web URLs
- ePub files
- Public YouTube URLs with captions
- Gemini chats, which can be added as context to NotebookLM notebooks

Important caveats:

- Uploaded files are limited to 500,000 words or 200 MB per source
- Google Drive imports auto-sync every few minutes
- NotebookLM does not import footnotes or comments from Google files
- Web URL imports only use page text, not embedded media or nested pages
- YouTube imports require public videos with captions
- Drive audio import is not supported

## Export / automation

- Official export is documented only for notes: NotebookLM can export notes to Google Docs or Google Sheets from the Studio panel.
- I found no official notebook-level bulk export, upload API, webhook, or programmatic import/export workflow.
- NotebookLM’s help pages also note that the mobile app may have feature limitations, so the web UI is the primary supported surface.

## Business / enterprise

- NotebookLM is a core service for many Google Workspace and Workspace for Education editions.
- Google also documents higher-access tiers through Google AI Pro / Ultra and Workspace licensing.
- Workspace docs emphasize enterprise-grade security and privacy, but do not document any NotebookLM API for admins or developers.

## Links

- NotebookLM Help Center: https://support.google.com/notebooklm/?hl=en
- Add or discover new sources: https://support.google.com/notebooklm/answer/16215270?hl=en&ref_topic=16164070
- Export notes as Google Docs or Google Sheets: https://support.google.com/notebooklm/answer/16262519?hl=en&ref_topic=16164070
- Upgrade NotebookLM: https://support.google.com/notebooklm/answer/16213268?hl=en&ref_topic=16175214
- Use NotebookLM with a work or school Google account: https://support.google.com/notebooklm/answer/16337734?hl=en&ref_topic=16175214
- Frequently asked questions: https://support.google.com/notebooklm/answer/16269187?hl=en&ref_topic=16179690
