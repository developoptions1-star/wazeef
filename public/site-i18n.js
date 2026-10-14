/* ==========================================================================
   Wazeef — built-in site translation (no external service, no Google)
   Source language: Arabic. Targets: en, es, nl, de  (5 languages total)
   - Dictionary: public/i18n-data.js -> window.WZ_I18N (embedded in pages.js)
   - Translates text nodes + placeholder/title/aria-label/alt attributes
   - Longest-match substring engine: composite/dynamic strings get covered
   - Remembers each node's Arabic source, so switching languages never degrades
   - Self-heals: a MutationObserver re-translates content added after load
   - Choice is remembered in localStorage
   ========================================================================== */
(function () {
  'use strict';

  var SUPPORTED = ['ar', 'en', 'es', 'nl', 'de'];
  var LABELS = { ar: 'العربية', en: 'English', es: 'Español', nl: 'Nederlands', de: 'Deutsch' };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var AR_RE = /[\u0600-\u06FF]/;
  var AR_CH = /[\u0600-\u06FF]/;

  var DATA = window.WZ_I18N || {};
  var AR = DATA.ar || [];

  /* ---------- per-language index: exact map + first-character buckets ------ */
  var IDX = {};
  function idx(lang) {
    if (IDX[lang]) return IDX[lang];
    var arr = DATA[lang];
    if (!arr || !AR.length) return null;
    var map = Object.create(null), buckets = Object.create(null), i, k, v, c;
    for (i = 0; i < AR.length && i < arr.length; i++) {
      k = AR[i]; v = arr[i];
      if (!k || !v) continue;
      if (map[k] !== undefined) continue;
      map[k] = v;
      c = k.charAt(0);
      (buckets[c] || (buckets[c] = [])).push(k);
    }
    var keys = Object.keys(buckets);
    for (i = 0; i < keys.length; i++) {
      buckets[keys[i]].sort(function (a, b) { return b.length - a.length; });
    }
    IDX[lang] = { map: map, buckets: buckets };
    return IDX[lang];
  }

  /* ---------- translate one Arabic string into lang (or back to Arabic) --- */
  function translate(lang, s) {
    if (!s) return s;
    if (!AR_RE.test(s)) return s;
    var x = idx(lang);
    if (!x) return s;
    var k = s.replace(/\s+/g, ' ').trim();
    if (!k) return s;
    if (x.map[k] !== undefined) return x.map[k];
    return scan(k, x);
  }

  function scan(s, x) {
    var out = '', i = 0, n = s.length, changed = false;
    while (i < n) {
      var c = s.charAt(i);
      var b = x.buckets[c];
      var hit = null;
      if (b) {
        for (var j = 0; j < b.length; j++) {
          var key = b[j], L = key.length;
          if (i + L > n || s.substr(i, L) !== key) continue;
          var prev = i > 0 ? s.charAt(i - 1) : '';
          var next = i + L < n ? s.charAt(i + L) : '';
          if (AR_CH.test(prev) || AR_CH.test(next)) continue;
          hit = { key: key, L: L };
          break;
        }
      }
      if (hit) { out += x.map[hit.key]; i += hit.L; changed = true; }
      else { out += c; i++; }
    }
    return changed ? out : s;
  }

  /* ---------- DOM walking ---------- */
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };

  function eachText(root, fn) {
    if (!root) return;
    if (root.nodeType === 3) { fn(root); return; }
    if (root.nodeType !== 1) return;
    // document.createTreeWalker accepts any root node (element included)
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) fn(n);
  }

  function eachEl(root, fn) {
    if (!root) return;
    if (root.nodeType === 1) fn(root);
    if (root.querySelectorAll) {
      var all = root.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) fn(all[i]);
    }
  }

  function skipped(node) {
    var p = node.nodeType === 3 ? node.parentNode : node;
    return !!(p && p.closest && p.closest('.wz-i18n'));
  }

  function inert(n) {
    var p = n.parentNode;
    return !!(p && p.nodeName && SKIP_TAGS[p.nodeName]);
  }

  /* ---------- remember the Arabic source of a text node ---------- */
  function textSrc(n) {
    var cur = n.nodeValue;
    if (n._wzOut !== undefined && cur === n._wzOut) return n._wzSrc;
    if (n._wzSrc !== undefined && cur === n._wzSrc) return n._wzSrc;
    n._wzSrc = cur;
    n._wzOut = undefined;
    return cur;
  }

  function paintText(n, lang) {
    if (!n.parentNode || skipped(n) || inert(n)) return;
    var src = textSrc(n);
    if (!src) return;
    var out = lang === 'ar' ? src : translate(lang, src);
    if (out !== n.nodeValue) { n._wzOut = out; n.nodeValue = out; }
    else n._wzOut = out;
  }

  function attrSrc(el, a) {
    var cur = el.getAttribute(a);
    if (cur === null) return null;
    var out = el._wzOutA;
    if (out && out[a] !== undefined && cur === out[a]) return el._wzSrcA[a];
    var src = el._wzSrcA;
    if (src && src[a] !== undefined && cur === src[a]) return src[a];
    if (!src) src = el._wzSrcA = {};
    src[a] = cur;
    if (out) delete out[a];
    return cur;
  }

  function paintAttr(el, a, lang) {
    if (!el.getAttribute) return;
    if (el.closest && el.closest('.wz-i18n')) return;
    var src = attrSrc(el, a);
    if (!src) return;
    var out = lang === 'ar' ? src : translate(lang, src);
    if (!el._wzOutA) el._wzOutA = {};
    el._wzOutA[a] = out;
    if (out !== el.getAttribute(a)) el.setAttribute(a, out);
  }

  function paint(root, lang) {
    if (!root) return;
    eachText(root, function (n) { paintText(n, lang); });
    eachEl(root, function (el) {
      if (!el.getAttribute) return;
      for (var i = 0; i < ATTRS.length; i++) paintAttr(el, ATTRS[i], lang);
    });
    if (root === document.body && root === document.documentElement) { /* n/a */ }
  }

  /* ---------- state ---------- */
  var cur = 'ar';

  function paintTitle(lang) {
    var src = document._wzTitleSrc;
    if (src === undefined) {
      src = document._wzTitleSrc = document.title;
      document._wzTitleOut = undefined;
    }
    if (document.title !== document._wzTitleOut && document.title !== src) {
      src = document._wzTitleSrc = document.title;
    }
    var out = lang === 'ar' ? src : translate(lang, src);
    document._wzTitleOut = out;
    if (out !== document.title) document.title = out;
  }

  function setLang(lang, skipSave) {
    if (SUPPORTED.indexOf(lang) < 0) lang = 'ar';
    if (lang === cur) { markActive(); return; }
    cur = lang;
    if (!skipSave) { try { localStorage.setItem('wz_ui_lang', lang); } catch (e) {} }
    try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
    if (document.body) paint(document.body, lang);
    paintTitle(lang);
    markActive();
    updateBtnLabel();
  }

  /* ---------- observer: keep newly rendered content translated ---------- */
  var mo = null;
  function startObserver() {
    if (mo || !window.MutationObserver || !document.body) return;
    mo = new MutationObserver(function (muts) {
      if (cur === 'ar') return;
      var i, m;
      for (i = 0; i < muts.length; i++) {
        m = muts[i];
        if (m.type === 'characterData') {
          var t = m.target;
          if (t && t.nodeType === 3) paintText(t, cur);
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (!n) continue;
            if (n.nodeType === 3) { paintText(n, cur); continue; }
            if (n.nodeType !== 1) continue;
            if (n.closest && n.closest('.wz-i18n')) continue;
            paint(n, cur);
          }
        } else if (m.type === 'attributes') {
          paintAttr(m.target, m.attributeName, cur);
        }
      }
    });
    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt']
    });
  }

  /* ---------- UI ---------- */
  function css() {
    if (document.getElementById('wz-i18n-css')) return;
    var s = document.createElement('style');
    s.id = 'wz-i18n-css';
    s.textContent = [
      '.wz-i18n{position:relative}',
      '.wz-i18n-fixed{position:fixed;top:14px;left:14px;z-index:2147483645}',
      '.wz-i18n-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:rgba(212,168,83,.10);border:1px solid rgba(212,168,83,.32);color:#f0d78c;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;line-height:1;transition:.25s}',
      '.wz-i18n-btn:hover{background:rgba(212,168,83,.20);transform:translateY(-1px)}',
      '.wz-i18n-btn svg{width:15px;height:15px;stroke:#f0d78c;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
      '.wz-i18n-panel{position:fixed;top:0;left:0;min-width:170px;background:#12141a;border:1px solid rgba(212,168,83,.25);border-radius:14px;padding:8px;z-index:2147483646;box-shadow:0 18px 44px rgba(0,0,0,.55);display:none}',
      '.wz-i18n-panel.open{display:block}',
      '.wz-i18n-title{font-size:11px;color:#94a3b8;font-weight:700;padding:4px 8px 8px}',
      '.wz-i18n-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:9px;font-size:13px;color:#cbd5e1;cursor:pointer;font-family:Tajawal,sans-serif;transition:.15s}',
      '.wz-i18n-item:hover{background:rgba(212,168,83,.12);color:#f0d78c}',
      '.wz-i18n-item.on{background:rgba(212,168,83,.18);color:#f0d78c;font-weight:700}',
      '.wz-i18n-item i{font-style:normal;font-size:10px;color:#64748b}',
      '.wz-i18n-item.on i{color:#d4a853}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildUI() {
    if (document.getElementById('wz-i18n-wrap')) return;
    var host = document.querySelector('.navbar .user-info');
    if (!host) {
      host = document.createElement('div');
      host.className = 'wz-i18n-fixed';
      document.body.appendChild(host);
    }
    var wrap = document.createElement('div');
    wrap.className = 'wz-i18n notranslate';
    wrap.id = 'wz-i18n-wrap';
    var items = '';
    for (var i = 0; i < SUPPORTED.length; i++) {
      var c = SUPPORTED[i];
      items += '<div class="wz-i18n-item" data-l="' + c + '"><span>' + LABELS[c] + '</span><i>' +
        (c === 'ar' ? 'AR' : c.toUpperCase()) + '</i></div>';
    }
    wrap.innerHTML =
      '<button type="button" class="wz-i18n-btn notranslate" id="wz-i18n-btn">' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
      '<path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>' +
      '<span id="wz-i18n-label">اللغة</span></button>';
    host.insertBefore(wrap, host.firstChild);

    // اللوحة بتتعلّق في body مباشرة (مش جوّه الـ navbar) عشان أي مودال أو طبقة ما تغطيهاش
    var panel = document.createElement('div');
    panel.className = 'wz-i18n-panel notranslate';
    panel.id = 'wz-i18n-panel';
    panel.innerHTML = '<div class="wz-i18n-title">Language / اللغة</div>' + items;
    document.body.appendChild(panel);

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('#wz-i18n-btn');
      if (!btn) return;
      var p = document.getElementById('wz-i18n-panel');
      var willOpen = !p.classList.contains('open');
      p.classList.toggle('open', willOpen);
      if (willOpen) positionPanel(btn, p);
    });
    panel.addEventListener('click', function (e) {
      var it = e.target.closest && e.target.closest('.wz-i18n-item');
      if (!it) return;
      setLang(it.getAttribute('data-l'));
      panel.classList.remove('open');
    });
    document.addEventListener('click', function (e) {
      var p = document.getElementById('wz-i18n-panel');
      if (!p || !p.classList.contains('open')) return;
      if (e.target && e.target.closest && (e.target.closest('#wz-i18n-wrap') || e.target.closest('#wz-i18n-panel'))) return;
      p.classList.remove('open');
    });
    updateBtnLabel();
    markActive();
  }

  function positionPanel(btn, panel) {
    try {
      var r = btn.getBoundingClientRect();
      var w = panel.offsetWidth || 180;
      var h = panel.offsetHeight || 200;
      var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      var top = r.bottom + 10;
      if (top < 8) top = 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 10);
      if (top < 8) top = 8;
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    } catch (e) {}
  }

  function updateBtnLabel() {
    var el = document.getElementById('wz-i18n-label');
    if (el) el.textContent = cur === 'ar' ? 'اللغة' : LABELS[cur];
  }

  function markActive() {
    var items = document.querySelectorAll('.wz-i18n-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('on', items[i].getAttribute('data-l') === cur);
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    css();
    buildUI();
    var saved = 'ar';
    try { saved = localStorage.getItem('wz_ui_lang') || 'ar'; } catch (e) {}
    if (SUPPORTED.indexOf(saved) < 0) saved = 'ar';
    if (saved !== 'ar') {
      cur = saved;
      try { document.documentElement.setAttribute('lang', saved); } catch (e) {}
      if (document.body) paint(document.body, saved);
      paintTitle(saved);
      updateBtnLabel();
      markActive();
    }
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.wzSetLang = function (l) { setLang(l); };
  window.wzI18nTranslate = function (s, l) { return translate(l || cur, s); };
  window.wzI18nStats = function () {
    var out = { lang: cur, phrases: AR.length, index: {} };
    Object.keys(IDX).forEach(function (k) { out.index[k] = Object.keys(IDX[k].map).length; });
    return out;
  };
})();
