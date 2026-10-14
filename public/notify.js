/* Wazeef in-app notifications
   - alert()  -> site toast (no native browser dialogs)
   - WZConfirm(msg, opts) -> Promise<boolean> in-app confirmation dialog
   Injected into every page by build-pages.js */
(function () {
  'use strict';

  var MAX_VISIBLE = 3;

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  function ensureCss() {
    if (document.getElementById('wz-notify-style')) return;
    var css = document.createElement('style');
    css.id = 'wz-notify-style';
    css.textContent = [
      '.wz-toasts{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;flex-direction:column;gap:10px;align-items:center;width:max-content;max-width:calc(100vw - 32px);pointer-events:none}',
      '.wz-toast{display:flex;align-items:flex-start;gap:10px;padding:13px 18px;background:rgba(14,14,14,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(212,168,83,.28);border-radius:14px;color:#f0d78c;font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;line-height:1.7;box-shadow:0 12px 36px rgba(0,0,0,.5);opacity:0;transform:translateY(18px);transition:all .3s cubic-bezier(.16,1,.3,1);pointer-events:auto;cursor:pointer;text-align:right;max-width:100%}',
      '.wz-toast.show{opacity:1;transform:translateY(0)}',
      '.wz-toast-ic{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;background:rgba(212,168,83,.16);color:#d4a853;border:1px solid rgba(212,168,83,.4);margin-top:1px}',
      '.wz-toast.success{border-color:rgba(34,197,94,.45);color:#bbf7d0}.wz-toast.success .wz-toast-ic{background:rgba(34,197,94,.16);color:#4ade80;border-color:rgba(34,197,94,.5)}',
      '.wz-toast.error{border-color:rgba(239,68,68,.45);color:#fecaca}.wz-toast.error .wz-toast-ic{background:rgba(239,68,68,.16);color:#f87171;border-color:rgba(239,68,68,.5)}',
      '.wz-toast.warn{border-color:rgba(245,158,11,.45);color:#fde68a}.wz-toast.warn .wz-toast-ic{background:rgba(245,158,11,.16);color:#fbbf24;border-color:rgba(245,158,11,.5)}',
      '.wz-back{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .2s ease}',
      '.wz-back.show{opacity:1}',
      '.wz-modal{width:100%;max-width:430px;background:linear-gradient(180deg,#141414,#0e0e0e);border:1px solid rgba(212,168,83,.22);border-radius:18px;padding:24px 22px 20px;box-shadow:0 24px 70px rgba(0,0,0,.6);transform:translateY(14px) scale(.98);transition:transform .2s ease;font-family:Tajawal,sans-serif;direction:rtl;text-align:right}',
      '.wz-back.show .wz-modal{transform:translateY(0) scale(1)}',
      '.wz-modal-title{font-size:16px;font-weight:800;color:#f0d78c;margin-bottom:10px;display:flex;align-items:center;gap:8px}',
      '.wz-modal-title::before{content:"?";display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:50%;background:rgba(212,168,83,.15);border:1px solid rgba(212,168,83,.4);color:#d4a853;font-size:13px;font-weight:800}',
      '.wz-modal-msg{font-size:14px;line-height:1.9;color:#cbd5e1;white-space:normal;word-break:break-word}',
      '.wz-modal-btns{display:flex;gap:10px;justify-content:flex-start;margin-top:20px}',
      '.wz-btn{flex:1;min-height:44px;border-radius:12px;border:1px solid transparent;font-family:Tajawal,sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s ease;padding:10px 14px}',
      '.wz-btn:focus{outline:none;box-shadow:0 0 0 3px rgba(212,168,83,.18)}',
      '.wz-btn-ok{background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;border-color:rgba(212,168,83,.6)}',
      '.wz-btn-ok:hover{filter:brightness(1.08);transform:translateY(-1px)}',
      '.wz-btn-ok.danger{background:linear-gradient(135deg,#b91c1c,#ef4444);color:#fff;border-color:rgba(239,68,68,.55)}',
      '.wz-btn-ghost{background:rgba(255,255,255,.05);color:#cbd5e1;border-color:rgba(255,255,255,.12)}',
      '.wz-btn-ghost:hover{background:rgba(255,255,255,.1);color:#f5f5f5}',
      '@media(max-width:500px){.wz-modal-btns{flex-direction:column-reverse}.wz-toast{font-size:13px;padding:12px 14px}}'
    ].join('');
    document.head.appendChild(css);
  }

  function inferType(msg) {
    var m = String(msg === null || msg === undefined ? '' : msg);
    if (/خطأ|فشل|لا يمكن|غير موجود|غير صالح|غير مسموح|من فضلك|لا توجد|لا يوجد|انتبه|ممنوع|مستخدم|مسج\s*ل|الرجاء|مطلوب|مرفوض|انتهت|سليمة|صحيحة|invalid|failed|error|forbidden/i.test(m)) return 'error';
    if (/تم|نجاح|بنجاح|انسخ|نسخة الرابط|success/i.test(m)) return 'success';
    if (/تنبيه|تحذير|قرب المعاد|warning/i.test(m)) return 'warn';
    return 'info';
  }

  function addLines(container, text) {
    String(text === null || text === undefined ? '' : text).split(/\r?\n/).forEach(function (line, i) {
      if (i) container.appendChild(document.createElement('br'));
      container.appendChild(document.createTextNode(line));
    });
  }

  function WZToast(msg, type) {
    ensureCss();
    if (!document.body) { setTimeout(function () { WZToast(msg, type); }, 60); return; }
    type = type || inferType(msg);
    var box = document.getElementById('wz-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wz-toasts';
      box.className = 'wz-toasts';
      document.body.appendChild(box);
    }
    while (box.children.length >= MAX_VISIBLE) box.removeChild(box.firstChild);

    var el = document.createElement('div');
    el.className = 'wz-toast ' + type;
    var ic = document.createElement('span');
    ic.className = 'wz-toast-ic';
    ic.textContent = type === 'success' ? '\u2713' : type === 'error' ? '\u2715' : type === 'warn' ? '!' : 'i';
    var txt = document.createElement('div');
    addLines(txt, msg);
    el.appendChild(ic);
    el.appendChild(txt);

    var timer = setTimeout(close, 4500);
    function close() {
      clearTimeout(timer);
      el.classList.remove('show');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }
    el.addEventListener('click', close);

    box.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    return el;
  }

  function WZConfirm(msg, opts) {
    opts = opts || {};
    ensureCss();
    return new Promise(function (resolve) {
      if (!document.body) { resolve(false); return; }
      var back = document.createElement('div');
      back.className = 'wz-back';
      back.innerHTML =
        '<div class="wz-modal" role="dialog" aria-modal="true">' +
        '<div class="wz-modal-title">' + esc(opts.title || 'تأكيد') + '</div>' +
        '<div class="wz-modal-msg"></div>' +
        '<div class="wz-modal-btns">' +
        '<button type="button" class="wz-btn wz-btn-ghost" data-a="0">' + esc(opts.cancel || 'إلغاء') + '</button>' +
        '<button type="button" class="wz-btn wz-btn-ok' + (opts.danger ? ' danger' : '') + '" data-a="1">' + esc(opts.ok || 'تأكيد') + '</button>' +
        '</div></div>';
      addLines(back.querySelector('.wz-modal-msg'), msg);

      var keyHandler = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        else if (e.key === 'Enter') { e.preventDefault(); done(true); }
      };
      function done(v) {
        document.removeEventListener('keydown', keyHandler, true);
        back.classList.remove('show');
        setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 250);
        resolve(v);
      }
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      Array.prototype.forEach.call(back.querySelectorAll('[data-a]'), function (b) {
        b.addEventListener('click', function () { done(b.getAttribute('data-a') === '1'); });
      });

      document.addEventListener('keydown', keyHandler, true);
      document.body.appendChild(back);
      requestAnimationFrame(function () {
        back.classList.add('show');
        var ok = back.querySelector('.wz-btn-ok');
        if (ok) ok.focus();
      });
    });
  }

  window.WZToast = WZToast;
  window.WZConfirm = WZConfirm;
  // Native dialogs are replaced by in-app messages everywhere
  window.alert = function (msg) { WZToast(msg); };
})();
