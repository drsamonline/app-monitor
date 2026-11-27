/* app — the Monitor page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the rule grammar, the scrape and the archive live in monitor-core.js. */
(function () {
  "use strict";
  var M = window.MonitorCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "monitor:store";
  var state = { store: M.emptyStore(), unreadable: null, lastRule: null };

  var els = {
    status: $("status"), pUrl: $("pUrl"), pTitle: $("pTitle"), pText: $("pText"), saveBtn: $("saveBtn"), saveNote: $("saveNote"),
    rName: $("rName"), rUrl: $("rUrl"), rSel: $("rSel"), ruleBtn: $("ruleBtn"), runBtn: $("runBtn"), ruleNote: $("ruleNote"), ruleList: $("ruleList"),
    runSays: $("runSays"), rowTable: $("rowTable"),
    q: $("q"), searchBtn: $("searchBtn"), searchSays: $("searchSays"), hitList: $("hitList"),
    exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    try { window.localStorage.setItem(K, M.serialize(state.store)); return true; }
    catch (e) {
      var kept = state.store.pages.length;
      var range = kept ? state.store.pages[0].savedOn + " \u2013 " + state.store.pages[kept - 1].savedOn : "nothing";
      setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") +
        ". New rows were dropped; what was kept covers " + range + ".");
      return false;
    }
  }

  function renderRules() {
    els.ruleList.textContent = "";
    var rows = M.ruleStatus(state.store.rules, Date.now());
    if (!rows.length) { els.ruleList.appendChild(node("li", null, "No rules yet.")); return; }
    rows.forEach(function (r) {
      var li = node("li", null, r.name + "  \u2014  " + r.selector);
      li.appendChild(node("span", "meta", r.host + " \u00b7 " + r.says));
      els.ruleList.appendChild(li);
    });
  }

  function savePage() {
    var out = M.savePage(state.store, { url: els.pUrl.value, title: els.pTitle.value, text: els.pText.value }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.store = out.store;
    if (!persist()) return;
    els.pText.value = "";
    setStatus("ok", out.says);
  }

  function saveRule() {
    var made = M.makeRule({ name: els.rName.value, url: els.rUrl.value, selector: els.rSel.value }, Date.now());
    if (!made.ok) { setStatus("bad", made.reason); return; }
    var added = M.addRule(state.store, made.rule);
    if (!added.ok) { setStatus("bad", added.reason); return; }
    state.store = added.store;
    state.lastRule = made.rule;
    if (!persist()) return;
    els.runBtn.hidden = false;
    renderRules();
    setStatus("ok", made.says);
  }

  function runRule() {
    if (!state.lastRule) { setStatus("bad", "Save a rule first."); return; }
    var out = M.runRule(state.lastRule, els.pText.value, Date.now());
    els.runSays.textContent = out.ok ? out.says : out.reason;
    els.rowTable.hidden = !out.ok;
    var tb = els.rowTable.querySelector("tbody");
    tb.textContent = "";
    (out.rows || []).forEach(function (r, i) {
      var tr = node("tr"); tr.appendChild(node("td", null, (i + 1) + ". " + r.text)); tb.appendChild(tr);
    });
    if (!out.ok) { setStatus("warn", out.reason); return; }
    var marked = M.markRun(state.store, state.lastRule.id, out.rows.length, Date.now());
    state.store = marked.store;
    var saved = persist();
    renderRules();
    if (saved) setStatus("ok", out.says);
  }

  function search() {
    var out = M.search(state.store, els.q.value);
    if (!out.ok) { setStatus("bad", out.reason); return; }
    els.searchSays.textContent = out.says;
    els.hitList.textContent = "";
    out.hits.forEach(function (h) {
      var li = node("li", null, h.title);
      li.appendChild(node("span", "meta", "saved " + h.savedOn + " \u00b7 " + h.url));
      li.appendChild(document.createTextNode(" " + h.excerpt));
      els.hitList.appendChild(li);
    });
    setStatus(out.count ? "ok" : "warn", out.says);
  }

  function doExport() {
    var out = M.exportFile("store", { store: state.store }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + " \u2014 pages, dates and rules."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  els.saveBtn.addEventListener("click", savePage);
  els.ruleBtn.addEventListener("click", saveRule);
  els.runBtn.addEventListener("click", runRule);
  els.searchBtn.addEventListener("click", search);
  els.exportBtn.addEventListener("click", doExport);

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = M.parseState(raw);
    if (parsed.ok) state.store = parsed.store;
    else {
      state.unreadable = parsed;
      if (parsed.rules && parsed.rules.length) { state.store.rules = parsed.rules; renderRules(); }
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable archive");
      keep.addEventListener("click", function () {
        var out = M.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  renderRules();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
