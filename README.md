# BSTM ELOS — Evolutionary Learning Operating System (v0.1, no AI)

A field intelligence app for the BSTM 100 Trials. Runs entirely in the browser,
works fully offline, stores everything on-device (IndexedDB), and exports
Markdown that matches the ELOS `02_trial_intelligence/BSTM-100T-XXX.md` format
exactly — so files you export here can be dropped straight into your
`bstm-elos` repository.

No backend. No AI yet (that's phase two, by design). No dependencies —
plain HTML/CSS/JS, so it will still work in five years with zero maintenance.

## What's included

- **Dashboard** — totals, recent activity, quick actions
- **New Trial** — the full guided form: Identification → Field Audit →
  Guided Conversation → Assumption Registry → Hypothesis/Experiment →
  Raw Evidence (with photo/document upload) → Interpretation → Confidence
  Update → Error Digestion → Capability Check → Ecosystem Mapping →
  Reflection & Score. Autosaves as you type.
- **Trials** — searchable/filterable archive, per-trial Markdown preview,
  download or copy Markdown
- **Patterns** — archetype library
- **Principles** — organizational principles library
- **Ecosystem** — the 63-room registry, tap to rename any room, see linked
  trial counts
- **Scorecard** — Learning Yield, Belief Drift Velocity, Predictive Accuracy,
  Uncertainty Rate, Error Digestion Speed — all computed from your real data
- **Settings** — full JSON backup/restore, bulk Markdown export, clear data

## File structure

```
elos/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── db.js          (IndexedDB storage layer)
│   ├── rooms.js        (63-room ecosystem registry)
│   ├── schema.js        (trial field definitions)
│   ├── markdown.js       (Markdown export, matches ELOS format)
│   ├── scorecard.js       (learning metrics)
│   ├── views.js            (dashboard, archive, patterns, etc.)
│   ├── trialForm.js         (the New Trial wizard)
│   └── app.js                 (router + init)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## How data flows into your Git repo

This is a **static site** — it cannot push to GitHub on its own (that would
require exposing a token in client-side code, which is unsafe). The workflow
is:

1. Fill in a trial in the app → autosaves locally on your phone.
2. Tap **Validate & Submit**.
3. Open the trial → **Download Markdown** (or **Settings → Download All
   Trial Markdown Files** for a bulk export).
4. Move the downloaded `.md` file(s) into `02_trial_intelligence/` in your
   `bstm-elos` repo and commit — same as you do today, just without hand-typing
   the file.

That keeps the Git repo as the permanent record, and the app as the fast
capture layer. Git push automation can be added later as an optional step
(e.g. a small companion script or GitHub Action you trigger manually) —
flagged as a v0.2 item in the blueprint.

---

## Deploy to GitHub Pages — copy/paste commands

Replace `YOUR_USERNAME` if this isn't going under `Todd366`. Run from the
folder that contains the `elos/` files (i.e. `index.html` should be directly
inside the repo root, not nested one level deeper).

### Option A — brand-new repo

```bash
cd elos
git init
git add .
git commit -m "BSTM ELOS v0.1 — field intelligence app (no AI)"
git branch -M main
git remote add origin https://github.com/Todd366/bstm-elos-app.git
git push -u origin main
```

Then turn on Pages:

```bash
# Using GitHub CLI (if installed):
gh repo edit Todd366/bstm-elos-app --enable-pages
gh api -X POST repos/Todd366/bstm-elos-app/pages -f source[branch]=main -f source[path]=/
```

Or manually: GitHub repo → **Settings → Pages → Source: Deploy from a
branch → Branch: `main` / `root`** → Save.

Your app will be live at:

```
https://todd366.github.io/bstm-elos-app/
```

### Option B — adding it into an existing repo as a subfolder

```bash
cd your-existing-repo
mkdir elos-app
cp -r /path/to/elos/* elos-app/
git add elos-app
git commit -m "Add BSTM ELOS field app"
git push
```

It will be live at:

```
https://todd366.github.io/your-existing-repo/elos-app/
```

### Updating after changes

```bash
git add .
git commit -m "elos: update field app"
git push
```

GitHub Pages redeploys automatically within a minute or two. Because of the
service worker cache, do a hard refresh (or bump `CACHE_NAME` in `sw.js`)
after deploying an update so your phone picks up the new version.

---

## Using it on your phone

1. Visit the GitHub Pages URL in Chrome/Safari.
2. Tap **Add to Home Screen** — it installs like a native app icon.
3. It works offline after the first load. Trials, patterns, and principles
   are stored on-device; nothing leaves your phone unless you export a
   backup or a Markdown file.

## Backing up

Go to **Settings → Export Full Backup (JSON)** regularly — this is your
safety net against clearing browser storage, losing the phone, etc. Import
it back on any device via **Settings → Import Backup**.

## What's deliberately not in v0.1

Per the approved blueprint, AI analysis, AI summaries, pattern suggestions,
and auto-generated principles are excluded for now. Everything else from the
blueprint (all 18 modules) is present in some working form. AI becomes a
separate module once this core workflow has been used for a while and proven
stable — same reasoning as the ELOS repo itself: usability before automation,
architecture before intelligence.

06_ecosystem_registry
- Connection between intelligence and BSTM departments

## Current Status

Version: ELOS v1.0

Trials Processed:
6

Active Intelligence:
Field research + organizational learning

## Governance Rule

Reality has authority.

No principle is promoted without evidence.
