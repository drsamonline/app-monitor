/* monitor-core — the engine behind Monitor.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: archive the pages you chose to keep, with their dates, and search them offline. It does
 * NOT crawl the web — there is no network code here at all, so a page can only arrive because you
 * pasted it.
 *
 * A rule is a small selector, validated when you save it, so a scrape is never run against a rule the
 * app did not understand. The grammar is deliberately tiny and documented:
 *
 *   tag          div
 *   .class       .headline
 *   tag.class    div.headline
 *   #id          #main
 *   tag[attr=v]  a[href=/story]
 *
 * Pure functions: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MonitorCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ddmm(ms) {
    var d = new Date(ms);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function stamp(when) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || ""));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated";
  }

  /* The age in words, because "not run since 12/11/2026" does not tell you whether that is a
   * problem. */
  function ageWords(fromMs, nowMs) {
    var d = Math.max(0, Math.floor(((nowMs || Date.now()) - (fromMs || 0)) / 86400000));
    if (d === 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 7) return d + " days ago";
    if (d < 30) return Math.floor(d / 7) + " week(s) ago";
    if (d < 365) return Math.floor(d / 30) + " month(s) ago";
    return Math.floor(d / 365) + " year(s) ago";
  }

  /* ------------------------------------------------------------- the rule */

  var SELECTOR = /^(?:([a-z][a-z0-9-]*)|\.([a-z0-9_-]+)|([a-z][a-z0-9-]*)\.([a-z0-9_-]+)|#([a-z0-9_-]+)|([a-z][a-z0-9-]*)\[([a-z-]+)=([^\]\s]+)\])$/i;

  function parseSelector(text) {
    var raw = clean(text);
    if (!raw) return { ok: false, field: "selector", reason: "a rule with no selector is refused" };
    var m = SELECTOR.exec(raw);
    if (!m) {
      return {
        ok: false, field: "selector", shown: raw,
        reason: "\u201c" + raw + "\u201d is not a selector this app understands (tag, .class, tag.class, #id, tag[attr=value]) \u2014 it was refused rather than run against your page"
      };
    }
    var spec = { raw: raw, tag: null, cls: null, id: null, attr: null, value: null };
    if (m[1]) spec.tag = m[1].toLowerCase();
    else if (m[2]) spec.cls = m[2];
    else if (m[3]) { spec.tag = m[3].toLowerCase(); spec.cls = m[4]; }
    else if (m[5]) spec.id = m[5];
    else if (m[6]) { spec.tag = m[6].toLowerCase(); spec.attr = m[7].toLowerCase(); spec.value = m[8]; }
    return { ok: true, spec: spec };
  }

  function parseUrl(text) {
    var raw = clean(text);
    if (!raw) return { ok: false, field: "url", reason: "a rule with no page address is refused" };
    var m = /^(https?):\/\/([^\s/?#]+)([^\s]*)$/i.exec(raw);
    if (!m) return { ok: false, field: "url", shown: raw, reason: "\u201c" + raw + "\u201d is not an http(s) address, so it was refused when saved" };
    return { ok: true, url: raw, host: m[2].toLowerCase() };
  }

  function makeRule(input, now) {
    var name = clean(input && input.name);
    if (!name) return { ok: false, field: "name", reason: "a rule needs a name, so a table can be recognised later" };
    var u = parseUrl(input && input.url);
    if (!u.ok) return u;
    var s = parseSelector(input && input.selector);
    if (!s.ok) return s;
    return {
      ok: true,
      rule: {
        id: "r-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: name, url: u.url, host: u.host, selector: s.spec.raw, spec: s.spec,
        lastRunAt: 0, lastRunRows: 0
      },
      says: "Rule saved: " + s.spec.raw + " on " + u.host + ". It has never been run."
    };
  }

  /* ------------------------------------------------------------ the scrape */

  /* A tiny tag scanner: enough for the documented grammar, and honest about what it cannot do. */
  function extract(html, spec) {
    var src = String(html || "");
    var rows = [];
    var re = /<([a-z][a-z0-9-]*)((?:\s+[a-z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*>/gi;
    var m;
    while ((m = re.exec(src))) {
      var tag = m[1].toLowerCase();
      var attrs = m[2] || "";
      if (spec.tag && tag !== spec.tag) continue;
      if (spec.cls) {
        var cm = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        var classes = cm ? (cm[1] || cm[2] || "").split(/\s+/) : [];
        if (classes.indexOf(spec.cls) < 0) continue;
      }
      if (spec.id) {
        var im = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        if (!im || (im[1] || im[2]) !== spec.id) continue;
      }
      if (spec.attr) {
        var am = new RegExp("\\b" + spec.attr + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i").exec(attrs);
        if (!am) continue;
        var val = am[1] != null ? am[1] : (am[2] != null ? am[2] : am[3]);
        if (spec.value && val !== spec.value) continue;
      }
      var close = src.toLowerCase().indexOf("</" + tag, re.lastIndex);
      var inner = close > -1 ? src.slice(re.lastIndex, close) : "";
      var text = clean(inner.replace(/<[^>]*>/g, " "));
      if (text) rows.push({ text: text, at: re.lastIndex });
    }
    return rows;
  }

  /* A scrape that matches nothing SAYS SO, rather than producing an empty table that looks like
   * "no results". */
  function runRule(rule, html, now) {
    if (!rule || !rule.spec) return { ok: false, reason: "there is no saved rule to run" };
    var rows = extract(html, rule.spec);
    var at = now || Date.now();
    if (!rows.length) {
      return {
        ok: false, matchedNothing: true, rows: [], ranAt: at,
        reason: "the rule matched nothing in this page. That is not the same as \u201cno results\u201d \u2014 it means the selector " +
          rule.selector + " found nothing here, so the rule may be wrong or the page may have changed."
      };
    }
    return { ok: true, rows: rows, ranAt: at, says: rows.length + " row(s) matched " + rule.selector + "." };
  }

  /* ------------------------------------------------------------- the archive */

  function emptyStore() { return { pages: [], rules: [] }; }

  /* A saved page keeps its text and the date it was saved. That is the whole archive. */
  function savePage(store, input, now) {
    var url = parseUrl(input && input.url);
    if (!url.ok) return url;
    var text = String((input && input.text) || "");
    if (!clean(text)) return { ok: false, field: "text", reason: "a page with no text is refused: there would be nothing to search" };
    var at = now || Date.now();
    var s = clone(store);
    s.pages.push({
      id: "p" + (s.pages.length + 1),
      url: url.url, host: url.host,
      title: clean(input && input.title) || url.host,
      text: text,
      savedAt: at, savedOn: ddmm(at),
      rows: Array.isArray(input && input.rows) ? input.rows.slice() : []
    });
    return { ok: true, store: s, page: s.pages[s.pages.length - 1], says: "Saved " + (clean(input && input.title) || url.host) + " on " + ddmm(at) + "." };
  }

  /* Offline search over what was saved, with the date it was saved. */
  function search(store, query) {
    var q = clean(query).toLowerCase();
    if (!q) return { ok: false, reason: "a search with no words in it was refused", hits: [] };
    var hits = [];
    ((store && store.pages) || []).forEach(function (p) {
      var hay = (p.title + " " + p.text + " " + p.url).toLowerCase();
      if (hay.indexOf(q) < 0) return;
      var at = hay.indexOf(q);
      hits.push({
        id: p.id, title: p.title, url: p.url, savedOn: p.savedOn, savedAt: p.savedAt,
        excerpt: p.text.replace(/\s+/g, " ").slice(Math.max(0, at - 60), at + 90).trim()
      });
    });
    hits.sort(function (a, b) { return b.savedAt - a.savedAt; });
    return {
      ok: true, hits: hits, count: hits.length,
      says: hits.length ? hits.length + " saved page(s) match \u201c" + clean(query) + "\u201d." : "Nothing saved matches \u201c" + clean(query) + "\u201d."
    };
  }

  /* Every rule shows when it was last run, in words — because "not run since 12/11/2026" does not tell
   * you whether that is a problem. */
  function ruleStatus(rules, now) {
    return (rules || []).map(function (r) {
      return {
        id: r.id, name: r.name, host: r.host, selector: r.selector,
        lastRunAt: r.lastRunAt, lastRunRows: r.lastRunRows,
        says: r.lastRunAt
          ? "last run " + ddmm(r.lastRunAt) + " (" + ageWords(r.lastRunAt, now) + "), " + r.lastRunRows + " row(s)"
          : "not run since it was saved (" + ageWords(r.savedAt || 0, now) + ")"
      };
    });
  }

  function markRun(store, ruleId, rows, now) {
    var s = clone(store);
    s.rules = s.rules.map(function (r) {
      if (r.id !== ruleId) return r;
      var n = JSON.parse(JSON.stringify(r));
      n.lastRunAt = now || Date.now();
      n.lastRunRows = rows || 0;
      return n;
    });
    return { ok: true, store: s };
  }

  function addRule(store, rule) {
    var s = clone(store);
    if (s.rules.some(function (r) { return r.id === rule.id; })) {
      return { ok: false, field: "name", reason: "there is already a rule called \u201c" + rule.name + "\u201d" };
    }
    var r = JSON.parse(JSON.stringify(rule));
    r.savedAt = rule.savedAt || Date.now();
    s.rules.push(r);
    return { ok: true, store: s };
  }

  /* --------------------------------------------------------------- storage */

  function clone(s) {
    var src = s || emptyStore();
    return {
      pages: (src.pages || []).map(function (p) {
        return { id: p.id, url: p.url, host: p.host, title: p.title, text: p.text, savedAt: p.savedAt, savedOn: p.savedOn, rows: (p.rows || []).slice() };
      }),
      rules: (src.rules || []).map(function (r) {
        return { id: r.id, name: r.name, url: r.url, host: r.host, selector: r.selector, spec: r.spec, lastRunAt: r.lastRunAt || 0, lastRunRows: r.lastRunRows || 0, savedAt: r.savedAt || 0 };
      })
    };
  }

  /* The rules are stored SEPARATELY from the table, so a broken table does not lose the searches
   * themselves. */
  function serialize(store) {
    var c = clone(store);
    return JSON.stringify({ version: VERSION, format: "monitor-1", pages: c.pages, rules: c.rules }, null, 2);
  }

  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "nothing has been saved on this device yet", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return { ok: false, unreadable: true, pagesLost: true, reason: "The saved pages cannot be read. They were NOT replaced with an empty archive \u2014 export them to keep them. The rules are stored separately and are shown below.", raw: raw };
    }
    if (!data || (!Array.isArray(data.pages) && !Array.isArray(data.rules))) {
      return { ok: false, unreadable: true, reason: "The saved file holds neither pages nor rules. Nothing was started over it; export it to keep it.", raw: raw };
    }
    /* a readable rules list survives an unreadable table */
    var rules = Array.isArray(data.rules) ? data.rules : [];
    var pagesOk = Array.isArray(data.pages);
    if (!pagesOk) {
      return { ok: false, unreadable: true, pagesLost: true, rules: clone({ rules: rules }).rules, reason: "The table is unreadable, but the rules were read and are shown. The pages were not replaced with an empty archive; export the file to keep them.", raw: raw };
    }
    return { ok: true, store: clone({ pages: data.pages, rules: rules }), raw: raw };
  }

  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "store") { name = "monitor-" + stamp(meta.when) + ".json"; body = serialize(payload.store); }
    else if (what === "raw") { name = "monitor-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return {
    version: VERSION,
    ageWords: ageWords,
    parseSelector: parseSelector,
    parseUrl: parseUrl,
    makeRule: makeRule,
    extract: extract,
    runRule: runRule,
    emptyStore: emptyStore,
    savePage: savePage,
    search: search,
    ruleStatus: ruleStatus,
    markRun: markRun,
    addRule: addRule,
    serialize: serialize,
    parseState: parseState,
    exportFile: exportFile
  };
});
