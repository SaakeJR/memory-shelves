# Memory Shelves V1.1.1

A free, standalone browser-based spatial-memory study application. This release includes The Study home screen, four study modes, Dark Oak/Birch/Cherry themes, structured Help, a version changelog, JSON backup and Quizlet-compatible term-definition exchange.

## V1.1.1 changes

- Full questions/terms up to 2,000 characters and definitions up to 10,000 characters. Optional 90-character short spine labels display on books without shortening the underlying question.
- Quizlet imports use staged, all-or-nothing library persistence: the saved library and current screen remain unchanged if storage rejects the new data. Download a backup if storage is full or unavailable.
- Duplicate detection reuses an existing matching room and bookshelf. Identical title + definition + topic pairs are skipped by default, including repeated entries within the same import. An optional checkbox permits duplicates. A different answer or topic is not treated as an identical card.
- Assign imported cards to different topic shelves using a third tab-delimited column, or edit each topic in the preview (first 30 visible; use the third column for larger imports).
- Quizlet-compatible input supports tab, comma, dash or custom term separators, plus newline-separated entries or blank-line-separated records with multiline definitions. For multiline content, select the matching format at import and export. Text compatibility does not include Quizlet accounts, images, metadata or learning progress.
- JSON study-set imports use the same duplicate protection and atomic saving behavior. Full-library JSON backups remain separate from Quizlet-compatible text exchange.
- Existing V1.1.0 features and built-in World History I materials are retained. Release notes remain in Settings.

## Installing to GitHub Pages

Upload **index.html**, **README.md**, and **LICENSE** from the deployment ZIP into the root of the existing `memory-shelves` repository. Replace the existing files. The GitHub Pages settings should still deploy from `main` branch and `/(root)`.

Before upgrading, use Settings to **Download full library backup**. Stored study progress and custom cards are local to each browser and do not sync between devices.

## Study file format

Default text import: `term<TAB>definition`, one pair per line. Optional topic: `term<TAB>definition<TAB>topic`. For definitions containing line breaks, choose **Blank line between books** in the import menu and keep records separated by a blank line. A custom separator can be chosen for term and definition. Quizlet-compatible export may normalize line breaks in the default single-line format; choose multiline export when line breaks must be retained.

For complete data portability, use a full JSON backup. Study-set JSON uses `room`, `bookshelf`, and `shelves` with a `name` and a `books` list containing `title` and `body` (optional `shortLabel`).

## Testing and limitations

Browser functional tests were run in headless Chromium at desktop and mobile widths. They cover 52-card imports with eight long questions, exact-duplicate detection, independent topic shelves, multiline text, short labels, reverse recall concealment, browser-storage failure simulation, and JSON import. A separate QA package contains the reproducible tests and results. This environment blocks local HTTP navigation, so real-origin persistence and Firefox/WebKit verification remain to be performed after deployment. Back up your library before updating.

## Content and licensing

Application source is MIT-licensed. Included course notes may have separate copyright restrictions; obtain permission before broadly redistributing instructor materials. The application has no login, server or paid subscription requirement.
