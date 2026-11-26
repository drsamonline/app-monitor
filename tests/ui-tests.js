#!/usr/bin/env node
/* ui-tests — the Monitor page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * npm install --no-save jsdom && node tests/ui-tests.js */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "monitor-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
ok("the engine loaded", !!w.MonitorCore);

$("pUrl").value = "https://news.example.com/story"; $("pTitle").value = "News"; $("pText").value = "The tank was cleaned after a complaint from residents.";
$("saveBtn").click();
ok("the page is saved", /Saved News on/.test($("status").textContent), $("status").textContent);

$("q").value = "complaint"; $("searchBtn").click();
ok("it is searchable offline", /1 saved page\(s\) match/.test($("searchSays").textContent), $("searchSays").textContent);
ok("the hit shows the date it was saved", /saved \d{2}\/\d{2}\/\d{4}/.test($("hitList").textContent), $("hitList").textContent);

$("rName").value = "Headlines"; $("rUrl").value = "https://news.example.com"; $("rSel").value = "div > p";
$("ruleBtn").click();
ok("a selector that does not parse is refused on the page", /not a selector this app understands/.test($("status").textContent), $("status").textContent);

$("rSel").value = "h2.headline"; $("ruleBtn").click();
ok("a valid rule is saved", /Rule saved/.test($("status").textContent), $("status").textContent);
eq("the run button appears", $("runBtn").hidden, false);

$("pText").value = '<h2 class="headline">Tank cleaned</h2><h2 class="headline">Supply restored</h2>';
$("runBtn").click();
ok("the rule runs on the pasted page", /2 row\(s\) matched/.test($("status").textContent), $("status").textContent);
eq("two rows are shown", d.querySelectorAll("#rowTable tbody tr").length, 2);
ok("the rule now shows when it last ran", /last run/.test($("ruleList").textContent), $("ruleList").textContent);

$("pText").value = "<p>nothing</p>"; $("runBtn").click();
ok("a scrape that matches nothing says so", /matched nothing/.test($("status").textContent), $("status").textContent);
ok("and says it is not no-results", /not the same as/.test($("runSays").textContent), $("runSays").textContent);

$("exportBtn").click();
ok("the archive exports", /Wrote monitor-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);

var saved = w.localStorage.getItem("monitor:store");
var dom2 = build({ "monitor:store": saved });
var d2 = dom2.window.document;
d2.getElementById("q").value = "complaint"; d2.getElementById("searchBtn").click();
ok("the reload keeps the archive", /1 saved page\(s\) match/.test(d2.getElementById("searchSays").textContent), d2.getElementById("searchSays").textContent);
ok("and the rules", /Headlines/.test(d2.getElementById("ruleList").textContent), d2.getElementById("ruleList").textContent);

var dom3 = build({ "monitor:store": JSON.stringify({ rules: [{ id: "r-1", name: "Kept rule", selector: "h2", host: "x" }] }) });
var d3 = dom3.window.document;
ok("a broken table is reported", /unreadable|cannot be read|not replaced/.test(d3.getElementById("status").textContent), d3.getElementById("status").textContent);
ok("but the rules survive it", /Kept rule/.test(d3.getElementById("ruleList").textContent), d3.getElementById("ruleList").textContent);

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("pUrl").value = "https://e.com"; d4.getElementById("pTitle").value = "x"; d4.getElementById("pText").value = "some text";
d4.getElementById("saveBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);
ok("and says rows were dropped and what was kept", /dropped/.test(d4.getElementById("status").textContent) && /kept covers/.test(d4.getElementById("status").textContent));

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
