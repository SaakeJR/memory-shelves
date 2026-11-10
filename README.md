# Memory Shelves

**Memory Shelves** is a free, browser-based study tool that combines spatial organization with active recall. Instead of studying only from a conventional flashcard list, you work with virtual books and place them on topic-specific shelves. The goal is to associate information with a consistent location and make review more interactive.

**Open the app:** https://saakejr.github.io/memory-shelves/

## Getting started

1. Open **The Study** and choose a room, such as a class or subject.
2. Choose a bookshelf, such as an exam or study set.
3. Select a book to read or test yourself on its contents.
4. Place books onto their topic shelves as you study, or use **I Know This · Auto Place** to shelve a known book automatically.
5. Use **Bottom of Stack** or **Shuffle Back** to defer unfamiliar books. Use **Reset** beside any shelf title to unshelve only that shelf’s books.

World History I Exam 2 contains 166 cards, organized across seven overview shelves in the complete exam and seven detailed part bookshelves. All seven part bookshelves share the same books and progress. Map exercises are excluded. The built-in library includes World History I and **Essentials of Philosophy**, with 60 Exam 2 cards organized on Kant, Nietzsche, Locke, and Descartes shelves. You can also create your own rooms, bookshelves, shelves, and books for other subjects.

Use the **Help** button at the top of the application for detailed instructions. Help includes explanations of study modes, importing study sets, and customizing your library.

## Study modes

- **Placement:** See the term and definition while organizing books by topic.
- **Recall, term first:** See the term and try to remember the definition before revealing it.
- **Recall, definition first:** See the definition and try to remember the term before revealing it.
- **Browse:** Review the books and shelves you have organized.

## Importing and exporting study materials

Memory Shelves supports Quizlet-compatible **text** import and export. You can copy a set of terms and definitions from Quizlet, paste them into Memory Shelves, preview the entries, and choose where to place them.

The default format is one book per line, with a tab between the term and definition:

```text
Term<TAB>Definition
Another term<TAB>Another definition
```

An optional third tab-separated column assigns a topic shelf:

```text
Term<TAB>Definition<TAB>Topic
```

The import screen also supports configurable separators and blank-line-separated records for multiline content. Check the preview before confirming an import. Identical entries can be skipped to avoid accidental duplicates.

This is a text-transfer feature, **not** a direct Quizlet account connection. Images, Quizlet study history, and other Quizlet-specific data are not transferred.

For complete Memory Shelves data portability, use the **JSON backup and restore** options in Settings rather than Quizlet-compatible text export.

## Appearance and settings

Choose from **Dark Oak**, **Birch**, and **Cherry** bookshelf themes. Theme changes affect the appearance, not the study content or placement rules.

Settings also contains the version changelog and library backup tools.

## Storage and privacy

Memory Shelves runs in your browser without requiring an account. Your custom study materials and progress are saved locally in that browser, not synchronized across devices. Clearing browser data or using a different browser can remove access to your saved work, so download a **full library backup** regularly, especially before clearing browser data or switching devices.

## Licensing and course materials

The application source is available under the MIT License; see [LICENSE](LICENSE). Course notes and other study content may be subject to separate rights. Do not redistribute instructor-provided material without appropriate permission.

## Study layouts

Bookshelf View is the default, keeping the bookshelf central to spatial learning. The labeled **Bookshelf / Flashcard** switch at the top changes to a larger central study card and unshelved stack, with the bookshelf to the side. Switch back using the same control, or choose a layout from **Settings → Appearance**. The layout choice is cosmetic and stored in this browser. The unshelved book stack arranges books across available columns without stretching them. Long book titles are shortened with an ellipsis on the book spine. The full question is preserved in the opened book and in exports.

## Easier placement on large study sets

The current book has a separate draggable spine beside the open study card. You can use it to place the book without searching the unshelved stack. The opened card and study actions expand naturally without internal scrollbars. The unshelved book stack remains independently scrollable. Use **Collapse stack** to hide the lower book list while keeping the current book and its placement controls visible.

In the Cherry theme, shelf and bookshelf plaques use light, high-contrast text.
