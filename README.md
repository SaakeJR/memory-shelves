# Memory Shelves

Memory Shelves is a free, browser-based study tool that combines spatial association, active recall, and tactile-style organization. Instead of reviewing a flat stack of flashcards, users practice by placing fact books on related topic shelves.

## V1.1.0 features

- **The Study:** a home screen to enter a course room or create another one.
- **Study modes:** placement (both sides visible), term-first recall (hide definition), definition-first recall (hide term), and browse.
- **Quizlet-compatible text exchange:** paste copied term-definition pairs into Add study set, or export a bookshelf's terms and definitions from Settings. Use one pair per line with a tab, comma, or dash separator. This is text exchange, not Quizlet account synchronization.
- **Appearance:** Dark Oak, Birch, and Cherry themes in Settings.
- **Help:** task-based guidance with an AI study-set prompt.
- **Changelog:** version notes in Settings, newest first.
- **JSON library backup:** download or restore the complete personal library.

## Getting started

Visit the website, choose **World History I** from **The Study**, and select an exam or quiz bookshelf. The built-in study cards are included for first-time visitors. Use the **MODE** dropdown under Study library to switch between study modes. Select an unsorted book, study its facts, then place it on the correct topic shelf. You can also add your own courses and cards.

## Saving and privacy

User-generated content and progress are saved in the browser's local storage, not an external account. They are not automatically synchronized between browsers or devices. Download a JSON backup from Settings to keep a copy. Clearing browsing data may remove progress.

## Deployment

This GitHub Pages edition runs from `index.html` without a server, build step, or paid hosting. To publish, upload `index.html`, `README.md`, and `LICENSE` to the repository's root. In GitHub **Settings → Pages**, choose **Deploy from a branch**, **main**, and **/(root)**. Subsequent updates can replace the files without changing the website URL.

## Content notice

The included World History I course materials are study aids based on highlighted class notes; they are not an official replacement for the instructor's packet. Check permission before publicly redistributing instructor-created content.

## License

The application code is licensed under MIT. The license does not grant rights to third-party instructional content.
