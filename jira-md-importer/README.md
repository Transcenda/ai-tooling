# Jira MD Importer — Browser Extension

Fills Jira's **Create Issue** form from a standardized `.md` ticket file.
No API tokens. No CORS. Works inside your existing Jira browser session.

## Install (Chrome / Edge / Brave)

1. Open **chrome://extensions** (or **edge://extensions**)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (`jira-md-importer/`)

Done. The extension is now active on `*.atlassian.net`.

## How to use

### Option A — via the Create Issue dialog
1. Open Jira and click **Create** to open the new issue dialog
2. An **Import MD** button appears in the dialog header (top-right of the form)
3. Click it → the importer panel slides in
4. Drop your `.md` file or paste the markdown
5. The panel previews **Summary**, **Repo**, and **Labels**
6. Click **Fill form fields** → Summary and Description are filled instantly
7. Adjust any remaining fields (Issue Type, Priority, etc.) and submit

### Option B — toolbar icon
1. Click the extension icon in the browser toolbar while on any Jira page
2. Click **Open panel now**
3. Same flow from step 4 above

## Markdown format expected

```markdown
# MCC-1234 — Short title of the ticket

### Background
What: ...
Why: ...

### Repository
protocol_deviation_ui

### Requirement
- bullet point
- another point

### Architectural Change
Yes/No. Details...

### Impacted Modules
| Module | Change |
|--------|--------|
| foo    | bar    |

### Test Plan
...

### Acceptance Criteria
AC 01 - First criterion
AC 02 - Second criterion
```

The extension handles:
- Strips ticket ID prefix from Summary (`MCC-1234 —` removed automatically)
- Fills the ProseMirror rich-text editor (Jira Cloud) or plain textarea fallback
- Suggests labels from the repository name

## Sharing with teammates

Just zip this folder and send it. They follow the same **Load unpacked** steps.
Or put it in a shared git repo and they pull it.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config |
| `content.js` | Injected into Jira pages — MD parser + panel UI |
| `panel.css` | Styles for the floating panel |
| `popup.html` | Toolbar icon popup |
| `icons/` | Extension icons |
