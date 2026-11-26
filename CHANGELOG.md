# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- **Save a page you kept**: address, title and text, archived with the date it was saved. Pasting is the
  only way a page gets in — there is no fetch anywhere in the app.
- **Offline search** over everything kept, with each hit showing the date it was saved.
- **A small selector grammar** (`tag`, `.class`, `tag.class`, `#id`, `tag[attr=value]`), validated when
  a rule is saved so a scrape is never run against a rule the app did not understand.
- **A scrape that matches nothing says so**, and says it is not the same as "no results".
- **Rules show when they last ran**, with the age in words ("6 days ago"), so a stale table cannot look
  live.
- **Rules are stored separately** from the table, so an unreadable table still shows the searches.
- A failed save says rows were **dropped**, with the date range of what was kept.
- An unreadable archive is reported and offered for export, never replaced with an empty one.
- PWA shell, CI (50 engine assertions + 19 in jsdom + page smoke), and the app-builder pipeline pinned
  to the canonical SHA for the EXE/APK/Linux release.

### Not built
- Crawling, fetching or any scheduled scrape. The spec forbids crawling and the house rules forbid a
  runtime network call, so the app archives what you paste and says how old every rule is.
