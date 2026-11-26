#!/usr/bin/env node
/* self-tests — Monitor. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * The spec's "done means": "a saved page is searchable offline and shows the date it was saved." */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var M = require(path.join(ROOT, "docs", "play", "monitor-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
var DAY = 86400000, SAVED = Date.UTC(2026, 10, 20), NOW = Date.UTC(2026, 10, 26);
var HTML = '<html><body><h2 class="headline">Tank cleaned after complaint</h2><p>x</p><h2 class="headline">Water supply restored</h2><h2 class="other">Nope</h2></body></html>';

section("done means — a saved page is searchable offline and shows the date it was saved");
var rule = M.makeRule({ name: "Headlines", url: "https://news.example.com", selector: "h2.headline" }).rule;
var store = M.addRule(M.emptyStore(), rule).store;
var saved = M.savePage(store, { url: "https://news.example.com/story", title: "News", text: "The tank was cleaned after a complaint from residents." }, SAVED);
eq("the page is saved", saved.ok, true);
var hits = M.search(saved.store, "complaint");
eq("it is found by a word in it", hits.count, 1);
eq("and it carries the date it was saved", hits.hits[0].savedOn, "20/11/2026");
ok("the date is on the hit itself", !!hits.hits[0].savedAt);
eq("a word not in it returns nothing", M.search(saved.store, "zebra").count, 0);
eq("an empty query is refused", M.search(saved.store, "  ").ok, false);

section("the rule — a selector that does not parse is refused when saved");
var badSel = M.makeRule({ name: "x", url: "https://e.com", selector: "div > p" });
eq("it is refused", badSel.ok, false);
eq("the field is the selector", badSel.field, "selector");
ok("the value is shown back", /div > p/.test(badSel.reason), badSel.reason);
ok("and says it was not run against your page", /refused rather than run/.test(badSel.reason), badSel.reason);
eq("a bad url is refused", M.makeRule({ name: "x", url: "not a url", selector: ".a" }).field, "url");
eq("a rule with no name is refused", M.makeRule({ url: "https://e.com", selector: ".a" }).field, "name");
["div", ".headline", "h2.headline", "#main", "a[href=/story]"].forEach(function (sel) {
  eq("the documented grammar accepts " + sel, M.makeRule({ name: "n" + sel, url: "https://e.com", selector: sel }).ok, true);
});

section("the scrape — rows, or a refusal that says it matched nothing");
var run = M.runRule(rule, HTML, NOW);
eq("two rows match", run.rows.length, 2);
eq("the first is the headline", run.rows[0].text, "Tank cleaned after complaint");
ok("the class filter is honoured", run.rows.every(function (r) { return r.text.indexOf("Nope") < 0; }));
var none = M.runRule(rule, "<html><body><p>nothing here</p></body></html>", NOW);
eq("a scrape that matches nothing is not a success", none.ok, false);
eq("it is marked as matched-nothing", none.matchedNothing, true);
ok("and says it is not the same as no results", /not the same as/.test(none.reason), none.reason);

section("the rules are stored separately, so a broken table keeps the searches");
var split = M.parseState(JSON.stringify({ rules: [{ id: "r-x", name: "Headlines", selector: "h2.headline" }] }));
eq("the file is reported as unreadable", split.ok, false);
eq("but the rules come back", split.rules.length, 1);
ok("and it says the pages were not replaced", /not replaced with an empty archive/.test(split.reason), split.reason);
var bad = M.parseState("{ broken");
eq("a broken file is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
eq("the raw text is kept for export", bad.raw, "{ broken");
eq("nothing saved yet is distinguished from a broken store", M.parseState("").empty, true);

section("every rule shows when it was last run, in words");
var status = M.ruleStatus(saved.store.rules, NOW)[0];
ok("a never-run rule says so", /not run since it was saved/.test(status.says), status.says);
var marked = M.markRun(saved.store, rule.id, 2, SAVED).store;
var after = M.ruleStatus(marked.rules, NOW)[0];
ok("a run rule shows the date and the age in words", /last run 20\/11\/2026 \(6 days ago\), 2 row\(s\)/.test(after.says), after.says);
eq("today reads as today", M.ageWords(NOW, NOW), "today");
eq("one day reads as yesterday", M.ageWords(NOW - DAY, NOW), "yesterday");
eq("nine days reads in weeks", M.ageWords(NOW - 9 * DAY, NOW), "1 week(s) ago");
eq("sixty days reads in months", M.ageWords(NOW - 60 * DAY, NOW), "2 month(s) ago");

section("must-not — it must not crawl the web");
var core = read("docs/play/monitor-core.js");
ok("no fetch, XHR, WebSocket or beacon", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(core + read("docs/play/app.js")));
/* the word "crawl" appears in the comment that promises not to; scan the CODE for a crawler */
ok("no crawler or url queue in the code",
  !/crawl\w*\s*\(|spider|urlQueue|queueUrl/i.test(core.replace(/\/\*[\s\S]*?\*\//g, "")));
ok("the only way a page arrives is being pasted", /pasted it/.test(core));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));

section("failure case — storage full or unavailable");
var thrown = M.exportFile("store", { store: saved.store }, { when: "26/11/2026" }, function () {
  var e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
});
eq("a failed write is reported as failed", thrown.ok, false);
ok("it says the file was not written", /not written/.test(thrown.reason), thrown.reason);
ok("it names the cause", /storage is full/.test(thrown.reason));
ok("the page says how many rows were dropped and the range kept", /dropped/.test(read("docs/play/app.js")) && /kept/.test(read("docs/play/app.js")));

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (s) { ok("script src resolves: " + s, fs.existsSync(path.join(ROOT, "docs", "play", s.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
