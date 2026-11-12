# Memory Shelves

**Release: V1.6.1**. This update fixes intermediate-width split-screen layout, Create / Import navigation highlighting, and adds export shortcuts to Create / Import.

**Memory Shelves** is a free, browser-based study tool that combines spatial organization with active recall. Instead of studying only from a conventional flashcard list, you work with virtual books and place them on topic-specific shelves. The goal is to associate information with a consistent location and make review more interactive.

**Open the app:** https://saakejr.github.io/memory-shelves/

## Getting started

1. Open **The Study** and choose a room, such as a class or subject.
2. Choose a bookshelf, such as an exam or study set.
3. Select a book to read or test yourself on its contents.
4. Place books onto their topic shelves as you study, or use **I Know This · Auto Place** to shelve a known book automatically, including before revealing an answer in either recall mode. Manual shelf placement and dragging are also available before revealing an answer in either recall mode.
5. Use **Bottom of Stack** or **Shuffle Back** to defer unfamiliar books. Use **Reset order** next to Shuffle remaining to restore the default order of unshelved books without resetting your progress. Use **Reset** beside any shelf title to unshelve only that shelf’s books.

World History I Exam 2 contains 166 cards, organized across seven overview shelves in the complete exam and seven detailed part bookshelves. Detailed topic shelves have distinct names to reduce confusion. All seven part bookshelves share the same books and progress. Map exercises are excluded. The built-in library includes World History I (Prof. Jensen), Essentials of Philosophy (Prof. Suzuki) with 60 Exam 2 cards, and Christian Theology I (Dr. Gifford) with cumulative Quiz 4 vocabulary and memory verses. Two Theology Proper verse-selection cards intentionally remain open-ended for students to personalize. You can also create your own rooms, bookshelves, shelves, and books for other subjects.

On your first visit, a welcome guide explains the main controls and that your changes are saved only in your browser. Use the **Help** button at the top of the application for detailed instructions. Help includes explanations of study modes, importing study sets, and customizing your library.

**Browse** is one of the four methods in the Study sidebar, not a separate top navigation page. In Browse, **Your books** follow the original shelf and book order even after study shuffling. Use **Previous** and **Next book** beside **Expand** above the open book to move backward and forward through the current shelf selection. Navigation wraps at either end. In the other study methods, **Next book** remains above the card so the navigation does not move when card length changes.

## Study modes

- **Placement:** See the term and definition while organizing books by topic.
- **Recall, term first:** See the term and try to remember the definition before revealing it.
- **Recall, definition first:** The definition is shown prominently while the term remains hidden until you reveal it. Where a definition repeats its term, the displayed clue uses a blank instead. Original source text remains preserved in the stored book.
- **Browse:** Read and interact with books in original shelf order, using Previous and Next without changing study progress.

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

To export Quizlet-compatible text, use **Create / Import → Export for Quizlet** or **Settings → Export for Quizlet**, then select a room, bookshelf, and optionally a topic. For complete Memory Shelves data portability, use the **JSON backup and restore** options in Settings rather than Quizlet-compatible text export.

When creating a book manually, **Cover color** defaults to **Auto**, assigning the next of seven repeating cover styles so books do not all look alike. Select **Style 1–7** to choose a specific cover. Existing books keep their chosen color when edited unless you change it.

## Appearance and settings

Choose from **Dark Oak**, **Birch**, and **Cherry** bookshelf themes. Theme changes affect the appearance, not the study content or placement rules.

Settings also contains the version changelog and library backup tools.

## Storage and privacy

Memory Shelves uses **Cloudflare Web Analytics** to measure aggregate visits to the public website. The analytics script is supplied by Cloudflare and does not receive your saved books, definitions, or study progress from Memory Shelves. Cloudflare may process technical visit information under its [privacy policy](https://www.cloudflare.com/privacypolicy/). The website does not require an account. Analytics is separate from the local study library. Review applicable privacy obligations before offering the site to visitors in different jurisdictions.

Memory Shelves runs in your browser without requiring an account. Your custom study materials and progress are saved locally in that browser, not synchronized across devices. Clearing browser data or using a different browser can remove access to your saved work, so download a **full library backup** regularly, especially before clearing browser data or switching devices.

## Licensing and course materials

The application source is available under the MIT License; see [LICENSE](LICENSE). Course notes and other study content may be subject to separate rights. Do not redistribute instructor-provided material without appropriate permission.

## Study layouts

Flashcard View is the default, emphasizing the larger study card. Bookshelf View remains available on desktop for spatial sorting. The labeled **Bookshelf / Flashcard** switch at the top changes to a larger central study card and unshelved stack, with the bookshelf to the side. Switch back using the same control, or choose a layout from **Settings → Appearance**. The layout choice is cosmetic and stored in this browser. The unshelved book stack arranges books across available columns without stretching them. Long book titles are shortened with an ellipsis on the book spine. The full question is preserved in the opened book and in exports.

## Easier placement on large study sets

The current book has a separate draggable spine beside the open study card. You can use it to place the book without searching the unshelved stack. The opened card and study actions expand naturally without internal scrollbars. The unshelved book stack remains independently scrollable. Use **Collapse stack** to hide the lower book list while keeping the current book and its placement controls visible.

In the Cherry theme, shelf and bookshelf plaques use light, high-contrast text.

## Definition-first study display

Memory Shelves may replace a repeated term with a blank in the displayed definition to make reverse recall useful. This affects only the study display. Original stored questions, facts, references, and exported data are preserved.


## Built-in courses and instructors

- World History I (Prof. Jensen)
- Essentials of Philosophy (Prof. Suzuki)
- Christian Theology I (Dr. Gifford)

Course materials are tied to the listed instructors. A course with the same name taught by another instructor may cover different content.

### Christian Theology I, Quiz 4

The five shelves are Quiz 1 Vocabulary, Quiz 2 Vocabulary, Quiz 3 Vocabulary, Quiz 4 Vocabulary, and Memory Verses. The Memory Verses shelf contains the three cumulative passages prescribed in the syllabus and two Theology Proper worksheet verse placeholders. To enter your own verses, select the relevant room and bookshelf, choose the verse under **Books**, then click **Edit book**.

Flashcard View is the starting layout. The desktop layout preference persists, and you can switch at any time on larger screens. On mobile, the card-first arrangement is always used.

## Saving and sharing study material

Your edits and study progress save automatically in your browser and do not change anyone else's library. In **Settings**, you can download a full library backup or export a study set and send it to someone else. They can import that copy on their device. Later edits do not sync between copies. Back up your library before clearing browser data or changing devices.

The Help menu is organized for beginners: Getting started, Study modes explained, Placing books, Study layouts and themes, Managing study sets, Importing study sets, Progress/backups/sharing, and Troubleshooting.

## Choosing a theme and layout

Birch is the default theme. Use the palette icon in the header to choose Birch, Dark Oak, or Cherry. On desktop, the Bookshelf/Flashcard switch changes how the study card and shelves are arranged. Flashcard is the starting layout. On mobile, the layout switch is hidden and the card-first layout is used to keep the study controls accessible; the desktop preference stays saved. Theme and layout do not change your books or study progress.

## Converting another person's printable Quizlet set

Quizlet's Export option may be unavailable when you are not the set creator. On a desktop browser, open the set, choose More → Print, and save the printable version as a PDF through your browser's print dialog. Then attach the PDF to an AI assistant and use the **Prompt for Quizlet PDF** provided in Memory Shelves Help. Review the converted term-definition pairs and their count before importing the generated JSON through Create / Import. Print options can vary. Respect the original creator's rights and the terms governing reuse of study material.


## Create and share material

On the Study screen, use the **New** and **Edit** controls beside the room, bookshelf, shelf, and book selectors. Book spine previews are optional. To share material without your personal progress, open **Settings → Export room or bookshelf**. Recipients choose **Create / Import → Shared room / bookshelf**. A shared bookshelf is added to a selected room. Sharing creates an independent copy, not a live synchronized library.

**Full library backup** includes all rooms and study progress and is intended for personal recovery, not sharing publicly. Restoring it replaces the current browser library. Deleting a populated shelf first offers to move its books, and room or bookshelf deletion requires typing DELETE. The browser may retain one recovery snapshot, but browser data removal erases both.

## Create / Import export controls

The **Create / Import** menu includes **Export room / bookshelf**, **Export for Quizlet**, and **Full library backup**. Full backups include personal progress and are intended for restoring your own library; room and bookshelf exports are shareable independent copies without progress. The Create / Import navigation button highlights only while its main dialog is open.
