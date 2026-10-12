# Note Buddy

A fast, distraction-free Markdown notepad that lives entirely in your browser.

Note Buddy is a lightweight note-taking tool for jotting down ideas, keeping running lists, and writing longer notes in Markdown. It keeps a searchable list of every note you write, renders your Markdown into clean formatted text with one click, and links notes to each other so you can build a small personal wiki. Everything you write stays saved automatically — there's nothing to remember to click.

## Features

### Notes list and organization
- **Sidebar list of all your notes**, sorted with the most recently edited note at the top.
- Each note in the list shows its **title**, a short **text preview** of its content (Markdown symbols like `#`, `*`, and backticks are stripped out so the preview reads cleanly), and a **relative timestamp** ("just now", "5m ago", "3h ago", "2d ago", or a full date for older notes).
- **Search box** at the top of the sidebar filters notes instantly as you type, matching against both note titles and their full body text.
- Click any note in the list to open it in the editor. The currently open note is highlighted.
- Hover over a note to reveal a small **delete (trash) icon**; deleting always asks for confirmation first since it can't be undone.

### Creating and editing notes
- Click **New Note** (in the sidebar or in the empty editor area) to start a fresh, untitled note.
- The editor has a large **title field** at the top (defaults to "Untitled note" if left blank) and a full-height writing area below it.
- A **word count badge** in the editor header updates live as you type.
- Every keystroke is saved automatically — see "How your notes are saved" below.

### Markdown writing and formatting toolbar
Notes are written in Markdown. A formatting toolbar sits above the writing area with one-click buttons for:

| Button | What it does |
|---|---|
| Bold | Wraps the selected text (or inserts placeholder text) in `**bold**` |
| Italic | Wraps text in `*italic*` |
| Strikethrough | Wraps text in `~~strikethrough~~` |
| H1 / H2 / H3 | Turns the current line into a level 1, 2, or 3 heading (replaces any existing heading marks on that line) |
| Link | Wraps selected text as `[text](url)` and selects "url" so you can type the address right away |
| Code | Wraps a single line of selected text in backticks, or wraps a multi-line selection (or an empty line) in a fenced code block |
| Quote | Toggles a `>` blockquote prefix on the selected line(s) |
| Bullet list | Toggles a `-` bullet prefix on the selected line(s) |
| Numbered list | Numbers the selected lines sequentially (`1.`, `2.`, `3.` …); clicking again removes the numbers |
| Horizontal rule | Inserts a `---` divider |

### Live preview
- The **preview toggle** button (top right of the editor) switches the writing area between raw Markdown ("source") and a fully rendered **preview** of the formatted note.
- The preview supports:
  - Headings (levels 1–6), each of which gets its own clickable anchor
  - **Bold**, *italic*, ~~strikethrough~~, and inline `code`
  - Fenced code blocks (three backticks) with a **hover-to-reveal Copy button** that copies the code to your clipboard and briefly shows a checkmark confirmation
  - Blockquotes (including quotes nested inside quotes)
  - **Callout boxes** — write a blockquote starting with `[!WARNING]`, `[!ERROR]`, or `[!SUCCESS]` on its own line to render a colored, icon-labeled callout box (yellow warning, red error, green success)
  - Bulleted and numbered lists
  - Tables, including column alignment (`:---`, `---:`, `:---:`), with automatic horizontal scrolling if a table is too wide for the screen
  - Horizontal rule dividers
  - Links — regular web links open in a new tab; links to other notes (see below) jump straight to that note
- Formatting-toolbar buttons and keyboard shortcuts automatically switch you back to source view if you're in preview, since you can't type Markdown directly into the rendered view.

### Linking notes together
- Type `[[` followed by a few letters of another note's title, and a suggestion popover appears listing matching notes. Pick one (with your mouse, or the arrow keys + Enter/Tab) to insert a Markdown link to it.
- Clicking that link while in **preview mode** takes you straight to the linked note.
- If you export and re-import your notes, links between notes are automatically kept intact even though each imported note gets a new internal ID.

### Word suggestions while typing
- As you type a word of three or more letters, Note Buddy quietly looks through the words used across *all* your notes and offers a short dropdown of matching completions (most frequently used words first). Use the arrow keys and Enter/Tab to accept a suggestion, or just keep typing to ignore it. Press Escape or click elsewhere to dismiss the popover.

### Smart typing helpers
- **Continuing lists automatically:** press Enter at the end of a bullet, numbered list, or blockquote line and Note Buddy continues it on the next line for you (numbered lists increment the number automatically). Press Enter on an *empty* list/quote line to exit the list and return to a normal paragraph.
- **Auto-closing pairs:** typing an opening parenthesis, bracket, quote mark, or backtick automatically adds its matching closing character. If you've selected text first, the pair wraps around the selection instead. If you type a closing character right where one was already auto-inserted, Note Buddy just moves your cursor past it instead of adding a duplicate.
- **Tab / Shift+Tab indenting:** press Tab to indent the current line (or every line in a multi-line selection) by two spaces; Shift+Tab removes two spaces of leading indentation.

### Search
- The search box in the sidebar filters your note list live by matching text anywhere in the title or body — handy for quickly jumping to a note when your list grows long.

### Export and import
- **Export** (download icon in the sidebar) saves *all* of your notes as a single `notebuddy-export.json` file — useful as a backup or for moving your notes to another browser or computer.
- **Import** (upload icon in the sidebar) lets you load notes back in from a previously exported JSON file. If you already have notes saved, you'll be asked whether to **Append** the imported notes to your existing ones or **Clean up & Replace** everything with the imported file. Files that aren't valid Note Buddy exports show a friendly error instead of breaking anything.
- If you don't have any notes yet, the empty note list offers a link to **load a few sample notes** so you can see the app's features in action right away (a short welcome note, a project-ideas list, and a recipe note that link to one another). If that link doesn't work for you, you can get the same sample notes by importing them manually.

## How your notes are saved

Note Buddy saves everything **directly in your browser** — there is no account, sign-in, or upload involved. Your notes (and which note you last had open) persist automatically between visits as long as you use the same browser on the same device. Nothing you write ever leaves your computer unless you deliberately use the Export button.

Because notes live in that one browser's local storage, they won't automatically appear on another browser or device — use Export and Import to move them across.

## Customization

Click the gear icon in the top-right corner to open **Settings**, where you can:
- Switch between **Light** and **Dark** theme
- Choose an **accent color** from six options: Indigo, Blue, Green, Rose, Amber, or Purple

Your theme and accent choices are remembered automatically for the next time you open the app.

## Tips & Shortcuts

- `Ctrl+B` (or `Cmd+B` on Mac) — Bold
- `Ctrl+I` (or `Cmd+I`) — Italic
- `Ctrl+K` (or `Cmd+K`) — Insert link
- `Tab` / `Shift+Tab` — Indent / outdent the current line or selection
- `Enter` inside a list or quote — continue the list/quote; press it again on an empty line to break out
- Type `[[` to search for and link to another note
- Type any word of 3+ letters to get autocomplete suggestions pulled from your own notes
- Selecting text before pressing a toolbar button (or a shortcut) applies the formatting to your selection instead of inserting placeholder text
- Hover over a note in the sidebar to reveal its delete button — nothing is ever deleted without a confirmation prompt
- The word count in the editor header is a quick way to keep an eye on how long a note is getting
