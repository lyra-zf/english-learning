# English Learning App

A personal English learning web app for Lucy. Tracks study plans, resources, daily progress, reminders, and review notes — all stored locally in your browser.

**Live URL:** https://lyra-zf.github.io/english-learning

## Features

| Module | What it does |
|--------|-------------|
| **Plan** | Set goals, create daily/weekly tasks by type (listening, speaking, reading, writing, vocabulary) |
| **Resources** | Save links to study materials with category tags |
| **Progress** | Daily check-ins, streak counter, weekly/monthly bar chart |
| **Reminder** | Browser push notifications at a set time each day |
| **Review** | Personal reflection notes with title, date, content, and key takeaways |

All data is stored in `localStorage` with the prefix `el_`. No server needed.

## Local Usage

Open `index.html` directly in any modern browser — no build step required.

```
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

## Deploy to GitHub Pages

### Option A — `main` branch root (simplest)

1. Create a new GitHub repository named `english-learning` under your account `lyra-zf`.
2. Push the files:

```bash
cd "path/to/english-learning"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/lyra-zf/english-learning.git
git push -u origin main
```

3. Go to **GitHub → repository → Settings → Pages**.
4. Under **Source**, select **Deploy from a branch**, choose `main`, folder `/` (root), and click **Save**.
5. Wait ~1 minute; the site will be live at `https://lyra-zf.github.io/english-learning`.

### Option B — `gh-pages` branch

```bash
git checkout -b gh-pages
git push origin gh-pages
```

Then in **Settings → Pages**, set the source branch to `gh-pages`.

### Updating the site

```bash
git add .
git commit -m "Update"
git push
```

GitHub Pages auto-deploys within ~1 minute after each push.

## File Structure

```
english-learning/
├── index.html    — full HTML structure (single page, all panels)
├── style.css     — responsive styles, green theme, dark mode support
├── app.js        — all JavaScript logic, no external dependencies
└── README.md     — this file
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Notifications require HTTPS or localhost — they will not work over `file://` URLs; deploy to GitHub Pages to test reminders.
