BUILD PROMPT — Monitor   (plan row #20 of 37)

## Inputs

```
APP:        Monitor
SPEC:       QUEUE/app-trawler.md
REPO:       https://github.com/drsamonline/app-monitor   (empty)
            the plan also matches: monitor, app-trawler, trawler
PLAN_ROW:   #20
MERGED:     trawler, harvest, beacon-watcher
```

This build absorbs 3 specs into one app. Their must-nots still bind, and all of them are quoted below.

---

## What you are building

One app, from its spec, into that repo. Nothing else. Not a second app, not a kit unless the
spec needs one, not a refactor of a neighbour.

### The house rules (they are not preferences)

- **Offline-first, always.** No server, no account, no telemetry, no network call at runtime.
  If the app needs a model, it ships in the app or the app says what it cannot do.
- **Single-file where possible.** One `docs/play/index.html` with its kits beside it. The
  build kit (`app-builder`) turns that into a Windows EXE and an Android APK — so the same
  bytes must work as a file:// page, an installed PWA and an APK.
- **The spec's "what it must NOT do" are test assertions, not prose.** Each one becomes a
  named test that fails if the app ever does it.
- **The spec's "what it does when things go wrong" is four cases**, and all four ship:
  bad input, no network, storage full or unavailable, corrupt saved state. An app that
  silently treats "no data" as "no matches" is not done.
- **Nothing is fabricated.** No invented data, no placeholder screenshot presented as a live
  capture, no badge nobody measures, no sample corpus passed off as the real thing. If an
  asset must be supplied by the owner, say so and leave the slot visibly empty.
- **India is the default audience**: ₹, lakh/crore, metric, dd/mm/yyyy, IST, and the local
  examples before the international ones.
- **Licence:** PolyForm Noncommercial 1.0.0 unless the spec says otherwise; SPDX headers on
  every source file; `data/SOURCE.md` recording the source, the licence of the **data**, and
  the fetch date for anything not written by us.

### Step 0 — Preflight (before you claim anything is missing)

1. Read the spec. Read its master-list row. Read its `PLAN.json` row, including `members` —
   a merged build's other specs are in `QUEUE/archive/` and their must-nots still apply.
2. **Rule 0: check the estate first.** Search the org for an app that already does this job.
   If one does, stop and report the collision with the repo name. Building the second version
   of a shipped app is the most expensive mistake available here.
3. Ask which credential you are holding. A `gh` 404 is a wrong credential, never proof of
   absence. Any finding of "impossible" must name the credential it was attempted with.
4. **You cannot create repositories.** If the repo does not exist, that is the owner's step —
   say so and stop. An empty repo that exists is yours to fill.

### Step 1 — Scope it in writing, before code

Produce a short block and keep it for the final report:

- the job, in one sentence;
- the mechanic that makes it not-generic, in one sentence;
- every **must-not**, as a test name;
- the four failure cases, as behaviour;
- the kits it needs (from the spec) and whether each already exists;
- what the app will **not** do in v1, explicitly.

If the app needs a capability no kit has: create the kit first, with its own test, and say so.

### Step 2 — Scaffold, do not hand-roll

`python3 scripts/new-app.py <app-id>` writes the shape:

```
docs/index.html          landing page (what it is, honest status, how to run it)
docs/play/index.html     the app itself
docs/play/*.js           the kits it vendors, next to the page that loads them
tests/self-tests.js      assertions, no framework
PAGES.json               the page manifest
README.md                what it does, how to run, what is not built
```

**Then prove the shape before you fill it:** every `<script src>` in the page must resolve to
a file that exists beside it. A scaffold has shipped here before with the kits in the wrong
folder, and the page 404'd its own runtime while the build stayed green.

If the repo is empty and `scripts/` is not available to you, build the same shape by hand —
the file list above is the contract, not the script.

### Step 3 — Build to the spec

Work the spec top to bottom. Where the spec is silent, choose the smaller behaviour and say
so in the report. Where the spec and the master-list one-liner disagree, **the spec body
wins** and the disagreement goes in the report (five such contradictions are already known).

### Step 4 — Tests that could fail

- `node tests/self-tests.js` — every must-not is an assertion; every failure case is a case.
- Print the count. A suite of 0 assertions is a failure, not a pass.
- **Mutation-test it**: break three things on purpose (remove a guard, make a refused input
  succeed, report a failed save as saved) and confirm the suite goes red each time. Restore.
- If the suite cannot go red, it is documentation, not a test.

### Step 5 — Deliver

- Pages on, demo live at `https://drsamonline.github.io/<repo>/`, and the demo **is** the app
  (no separate build of the page).
- A release with the EXE and APK from `app-builder`, built from the same source.
- Topics set (they are the discovery surface), licence headers, `CHANGELOG.md`, `NOTICE`.
- README states the real status: what works, what does not, what is untested.

### Step 6 — Record it

- Append one line to `PROGRESS.log`: what was built, the test counts, the demo URL, what was
  **not** built and why.
- **Do not edit `QUEUE/PLAN.json`.** `tools/queue-sync.py` flips the row to `built` when the
  repo and its Pages answer. Writing `built` by hand is how a plan starts lying.
- Do not edit `ACTIONS.md` — its build order is generated.

### Step 7 — Report in this shape

```
APP      <name>  (plan row #<order>, <n> specs merged)
REPO     <url>   commit <sha>
DEMO     <url>
TESTS    <n>/<n> assertions, mutation-tested <n> ways
BUILT    <the features that exist>
NOT BUILT <the features the spec asks for that do not, and why>
MUST-NOT <each one, and the test that holds it>
NEEDS    <what only the owner can supply: assets, keys, data, a decision>
NEXT     <the smallest honest next step for this app, or "done">
```

Never write "done" for a feature you did not prove. `unverified` with the reason is a better
line than a green claim.

---

## Definition of done (the owner's, not yours)

> A working app, with a working release, a landing page, and a live demo where the app is a
> web app — and the tests that prove the must-nots, run in CI.

Anything less is `partial`, and the report says which of the three is missing.

---

## When you are blocked

Say which of these it is, in one line, and stop:

- **no spec** → the spec is the next step, not the code;
- **the app already exists** → name the repo and the overlapping features;
- **the repo does not exist** → the owner creates it; you cannot;
- **a capability no kit has** → the kit is the next step;
- **an asset only the owner has** (a photo, a UPI ID, a licensed corpus, a key) → build the
  slot, leave it visibly empty, name what is needed;
- **a credential that cannot see the thing** → name the credential, not a verdict.

---

## The five ways this has gone wrong before

1. **Built the second version of a shipped app** — Rule 0 exists because of it.
2. **Shipped a scaffold whose page could not load its own kits** — prove every `src` resolves.
3. **Claimed a badge or a status nobody measures** — a green shield that lies is worse than none.
4. **Logged "done" from an exit code** — the verdict is the artifact on the branch, not git's
   exit status.
5. **Reported the system blocked on the strength of the wrong credential** — a 404 is a
   credential, not a fact.

---

# THE SPEC — Monitor (`app-trawler`)

# Trawler

- **id:** app-trawler
- **category:** Web search & scrape (one defined job)
- **tier:** Epic
- **source:** the app master list, #127
- **status:** READY - spec written

## Pitch

Define exactly what you want; it periodically searches and scrapes it into a clean table.

## The job

- Collect pages into a searchable local archive.

## The mechanic

- It archives WHAT YOU SAVED with its date, so a page you read last year is still readable when it changes.

## What it must NOT do

- crawl the web. It keeps what you chose to keep.

## What it does when things go wrong

- **Bad input** — a selector or URL that does not parse is refused when saved, with the reason, so a
  scrape is never run against a rule the app did not understand. A scrape that matches nothing says so
  rather than producing an empty table that looks like "no results".
- **No network** — this app scrapes, so it has a real dependency: with no network the saved pages and
  their dates still open, and every rule shows "not run since <time>" with the age in words.
- **Storage full or unavailable** — new rows are not written and the app says how many were dropped,
  with the date range of what was kept, so a gap in the table is visible.
- **Corrupt saved state** — an unreadable scrape store is reported and offered for export; the rules
  are stored separately, so a broken table does not lose the searches themselves.

## Kits it will need

- `web-kit` for the shell, storage and the PWA
- web-kit, search-kit, export-kit

## The data

- the saved pages and their dates, on the device.

## Done means

- a saved page is searchable offline and shows the date it was saved.

---

# SPECS THIS BUILD ABSORBS (2)

## `app-harvest` — Harvest

**Pitch**

Monitor keywords across many sites and collect matches.

**The job**

- Name the keywords and the sites, and collect every match into one table you can work from.

**The mechanic**

- It keeps a STANDING list of keyword-and-site pairs and checks them on a schedule, appending each new match with the date and the page it came from — so the table is a record of what appeared when, not a one-off scrape. A match already seen is not appended twice.

**What it must NOT do**

- crawl beyond the sites it was given, follow links it was not given, or present a match as verified. It collects what the page said; checking it is the user's job.

**What it does when things go wrong**

- **Bad input** — a keyword that is blank or a site URL that does not parse is refused when added, with
  the reason. A harvest with no sites selected says so rather than returning an empty result that looks
  like "no matches found".
- **No network** — this app watches the web, so it has a real dependency: with no network the keyword
  and site list opens and every source shows "not checked since <time>", with the age in words. It never
  shows a harvest that did not happen.
- **Storage full or unavailable** — new matches are not written and the app says how many were dropped;
  the date range of what was kept is shown, so a gap in coverage is visible.
- **Corrupt saved state** — an unreadable match store is reported and offered for export; the keyword
  list is preserved separately so a broken match file does not lose the searches themselves.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- `search-kit` for searching the collected matches
- `export-kit` for the table

## `app-beacon-watcher` — Beacon Watcher

**Pitch**

Watch specific pages for changes and alert on them.

**The job**

- Watch a page you name and tell you when its text changes, showing the change rather than a bare ping.

**The mechanic**

- It compares the page's TEXT between checks, so 'changed' always arrives with what changed. It stores the last-seen text per page, which means the first check records a baseline and raises no alert — alerting on first run would be noise, and noise is what gets a watcher switched off.

**What it must NOT do**

- crawl the web, discover pages, or act as a general scraper. One page, named by the user, watched. With no network it reports that it could not check — it must never report 'no change' when it did not look.

**What it does when things go wrong**

- **Bad input** — a URL that does not resolve or is not http(s) is refused when it is added, with the
  reason, rather than being watched forever and never matching.
- **No network** — this app is the estate's one genuine exception: watching needs the network. With none,
  the watch list and the alert history still open and every watch is shown as "not checked since
  <time>", with the age of that time in words. It never shows a check that did not happen.
- **Storage full or unavailable** — the last-seen text is not written, so the app does not report a
  change it cannot compare against; the watch is marked as unbaselined.
- **Corrupt saved state** — an unreadable baseline is reported per watch and that watch is re-baselined
  only with the user's agreement, so a corrupt file cannot manufacture an alert.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- `export-kit` for the change history

---

## After the build

- Append one line to `PROGRESS.log`. Do **not** edit `QUEUE/PLAN.json` — `tools/queue-sync.py` moves row #20 to `built` when the repo and its Pages answer.
- Report in the shape the brief asks for. Anything you did not prove is `unverified`, not done.
