# Monitor

The pages you chose to keep, with the date you kept them, searchable offline. **It does not crawl the web.**

- **Demo:** https://drsamonline.github.io/app-monitor/play/index.html
- **Landing page:** https://drsamonline.github.io/app-monitor/
- **Release:** https://github.com/drsamonline/app-monitor/releases/tag/app-latest
- **Plan row:** #20 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-trawler` (lead)
- **Licence:** PolyForm Noncommercial 1.0.0

## Status

| | |
|---|---|
| **Built** | Paste-to-archive with dates; offline search showing each hit's date; a small selector grammar validated at save time; scrape rows; matched-nothing said out loud; rules stored separately from the table; "last run … (6 days ago)" in words. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | Crawling, fetching, scheduled scrapes. No network code at all — a page arrives only because you pasted it. |
| **Untested** | The selector grammar against real-world HTML. It handles the five documented forms and ignores anything else by refusing it at save time; a page whose markup is nested oddly will match less than you expect, and the app says "matched nothing" rather than pretending. |

## The spec's "done means", counted

> "a saved page is searchable offline and shows the date it was saved."

| The spec says | The test |
|---|---|
| searchable offline | a saved page is found by a word in its text, with no network code in the app |
| shows the date it was saved | the hit carries `20/11/2026` and the epoch it was saved at |

## Why it does not crawl

The spec forbids crawling and the house rules forbid a runtime network call, so the honest architecture
is: **you paste, it archives**. The spec's own no-network clause then becomes the normal state rather
than a failure — every rule shows *"not run since … (6 days ago)"*, so a stale table can never look
live.

## The selector grammar, and why it is small

```
div            any <div>
.class         any element with that class
h2.headline    that tag with that class
#id            that id
a[href=/story] that tag with that attribute value
```

Anything else — `div > p`, `a:first-child`, XPath — is **refused when the rule is saved**, with the
value shown. A rule the app cannot parse must never be run against your page, because the result would
be an empty table that looks like "no results".

## What it will not do

- **Crawl the web.** No fetch, no crawler, no url queue.
- **Run a rule it did not understand.**
- **Show an empty table for a scrape that matched nothing** — it says so, and says that is not the same as "no results".
- **Lose the rules with a broken table** — they are stored separately.
- **Replace an unreadable archive with an empty one.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | A bad selector or address is refused at save time with the reason; a rule with no name is refused. |
| **No network** | Nothing changes; saved pages still open, and every rule shows its age in words. |
| **Storage full or unavailable** | Rows are **dropped**, said out loud, with the date range of what was kept. |
| **Corrupt saved state** | Reported and offered for export; the rules are read and shown. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 50 assertions
node tests/ui-tests.js        # the page in jsdom — 19 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026. Five failed cleanly: a bad selector accepted (crash), matched-
nothing looking like success (1), saved pages losing their date (1), rules lost with a broken table (1),
a never-run rule claiming a run (1), the search dropping the date (1). The first **crashed** the suite
rather than failing an assertion — recorded rather than tidied away.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — save a page, a rule, the rows, the search
docs/play/app.js           DOM wiring: save, rules, run, search, export
docs/play/monitor-core.js  the engine — selector grammar, extract, archive, search, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (50)
tests/ui-tests.js          page suite (19, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **The rule runs against the text you paste**, not against a URL, because there is no fetch. The URL on a rule is a label for you, not something the app calls.
- **Rules are validated at save time**, which is the only moment the person can fix a typo without wondering why a table is empty.
- **"Matched nothing" is a failure, not an empty success**, and the message says the rule may be wrong *or* the page may have changed — the app cannot tell which.
- **Rules are stored separately** so an unreadable table does not take the searches with it.
- **Age is in words**, because "not run since 12/11/2026" does not tell you whether that is a problem.

## What is not built, and why

**Crawling, fetching and scheduled scrapes.** The spec forbids crawling; the house rules forbid a
runtime network call; and a monitor that quietly fetches pages would be the one app in this fleet that
phones home. What ships is the part that is entirely yours: what you chose to keep, with the date you
kept it.
