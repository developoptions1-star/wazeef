/* session.js - global session guard (injected into every page by build-pages.js)
   1) wraps fetch() so any 401 from the API logs the user out immediately
   2) validates the session against the server on page load
   3) keeps users out of pages they have no access to (redirects to their home)
*/
(function () {
  var HOME = {
    admin: '/admin',
    agent: '/agent',
    qualty: '/agent',
    team_leader: '/agent',
    super_qualty: '/agent',
    user: '/dashboard',
    company: '/company'
  };
  var AGENT_ROLES = ['agent', 'qualty', 'team_leader', 'super_qualty'];
  var PAGE_ROLES = {
    '/dashboard': ['user'],
    '/admin': ['admin'],
    '/agent': AGENT_ROLES,
    '/company': ['company']
  };
  // These pages render their OWN login form, so a logged-out visitor must
  // stay on them instead of being thrown back to '/'.
  var OWN_LOGIN = ['/company'];
  var TOKEN_KEYS = ['token', 'company_token'];

  function clear() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('company_token');
      localStorage.removeItem('company_user');
      localStorage.removeItem('wz_audio_required_seen');
    } catch (e) {}
  }

  function homeFor(role) { return HOME[role] || '/'; }

  // Keep the identity stored on this device in sync with what the server says.
  // Pages read localStorage synchronously, so a stale role (old agent session,
  // revoked agent, dual account) is what makes pages disagree about the home
  // and bounce the visitor between /dashboard and /agent forever.
  function syncUser(d) {
    try {
      if (!d || !d.ok || !d.role) return;
      var raw = localStorage.getItem('user');
      if (!raw) return;
      var u = JSON.parse(raw);
      if (!u || typeof u !== 'object') return;
      var changed = false, wasAgent = u.role && AGENT_ROLES.indexOf(u.role) >= 0;
      if (AGENT_ROLES.indexOf(d.role) >= 0) {
        if (u.role !== d.role && (wasAgent || !u.role)) { u.role = d.role; changed = true; }
        if (u.agent_role !== d.role) { u.agent_role = d.role; changed = true; }
      } else if (d.role === 'admin' || d.role === 'company') {
        if (u.role !== d.role) { u.role = d.role; changed = true; }
        if (u.agent_role) { delete u.agent_role; changed = true; }
      } else {
        if (u.role && AGENT_ROLES.indexOf(u.role) >= 0) { u.role = 'user'; changed = true; }
        if (u.agent_role) { delete u.agent_role; changed = true; }
      }
      if (!changed) return;
      localStorage.setItem('user', JSON.stringify(u));
      // The agent console already read the old identity -> paint it once with
      // the corrected one (flagged so this can never happen twice in a row).
      if (location.pathname.replace(/\/+$/, '') === '/agent' && wasAgent === false) {
        try {
          if (sessionStorage.getItem('wz_id_reload') !== '1') {
            sessionStorage.setItem('wz_id_reload', '1');
            location.reload();
          } else sessionStorage.removeItem('wz_id_reload');
        } catch (e2) {}
      }
    } catch (e) {}
  }

  // Safety net: if pages keep sending the visitor somewhere else, stop the
  // ping-pong instead of bouncing forever.
  function goTo(path) {
    try {
      var now = Date.now(), s = {};
      try { s = JSON.parse(sessionStorage.getItem('wz_nav') || '{}'); } catch (e) { s = {}; }
      if (!s || typeof s !== 'object' || now - (s.t || 0) > 10000) s = { n: 0, t: now };
      s.n = (s.n || 0) + 1; s.t = now; s.last = path;
      sessionStorage.setItem('wz_nav', JSON.stringify(s));
      if (s.n > 6) { // redirect loop detected -> drop the session and stop
        try { sessionStorage.removeItem('wz_nav'); } catch (e2) {}
        clear();
        return;
      }
    } catch (e) {}
    location.replace(path);
  }

  // Log the session out and go back to the login screen (no history entry).
  function kick() {
    var here = location.pathname;
    clear();
    try { sessionStorage.removeItem('wz_nav'); } catch (e) {}
    if (here !== '/' && here !== '') location.replace('/');
  }

  function getToken(path) {
    path = path || location.pathname;
    try {
      if (path.indexOf('/company') === 0) {
        return localStorage.getItem('company_token') || localStorage.getItem('token');
      }
      return localStorage.getItem('token') || localStorage.getItem('company_token');
    } catch (e) { return null; }
  }

  // ---- 1. fetch wrapper: a 401 that marks the session dead means logout ----
  function hadAuth(input, init) {
    try {
      var h = init && init.headers;
      if (h) {
        if (typeof Headers !== 'undefined' && h instanceof Headers) { if (h.get('Authorization')) return true; }
        else if (typeof h === 'object') {
          for (var k in h) { if (String(k).toLowerCase() === 'authorization' && h[k]) return true; }
        }
      }
      if (input && typeof input === 'object' && input.headers) {
        var ih = input.headers;
        if (typeof Headers !== 'undefined' && ih instanceof Headers) { if (ih.get('Authorization')) return true; }
        else if (ih.authorization || ih.Authorization) return true;
      }
    } catch (e) {}
    return false;
  }
  function isAuthEndpoint(url) {
    return /\/(login|logout|register|verify|forgot|password|reset)/i.test(url);
  }

  var _fetch = window.fetch;
  if (_fetch) {
    window.fetch = function (input, init) {
      return _fetch.apply(this, arguments).then(function (res) {
        try {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          if (res.status === 401 && url.indexOf('/api/') === 0) {
            var sendAuth = hadAuth(input, init);
            res.clone().json().then(function (d) {
              var dead = d && d.code === 'SESSION_INVALID';
              if (!dead && sendAuth && !isAuthEndpoint(url)) dead = true;
              if (!dead) return;
              if (location.pathname !== '/' && location.pathname !== '') kick();
              else clear();
            }, function () {
              if (sendAuth && !isAuthEndpoint(url)) { if (location.pathname !== '/' && location.pathname !== '') kick(); else clear(); }
            });
          } else if (res.status === 403 && url.indexOf('/api/') === 0 && window.WZToast) {
            res.clone().json().then(function (d) {
              if (d && d.error && !d.code) window.WZToast(d.error, 'error');
            }, function () {});
          }
        } catch (e) {}
        return res;
      });
    };
  }

  // ---- 2. on-load validation: dead accounts / wrong pages ----
  function guard() {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    var token = getToken(path);
    if (!token) {
      if (PAGE_ROLES[path] && OWN_LOGIN.indexOf(path) < 0) kick(); // needs a session -> login
      return;
    }
    fetch('/api/auth/session', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) {
        if (r.status === 401) { kick(); return null; }
        return r.json().catch(function () { return null; });
      })
      .then(function (d) {
        if (!d || !d.ok) return;
        syncUser(d);
        var role = d.role;
        var want = PAGE_ROLES[path];
        if (!want) {
          // login page: a valid session jumps straight to its own home
          if (path === '/' && role && HOME[role]) goTo(homeFor(role));
          return;
        }
        if (want.indexOf(role) < 0) {
          if (location.pathname === homeFor(role)) return; // already home
          goTo(homeFor(role));
        }
      })
      .catch(function () {}); // network hiccup: keep the page, 401 handling still applies
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else setTimeout(guard, 0);

  window.WZSession = { kick: kick, clear: clear, homeFor: homeFor, guard: guard };
})();
