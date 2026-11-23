// Auth state for the whole app: { token, user: { id, full_name, email, role } }
// "Keep me signed in" → localStorage (survives closing the browser).
// Otherwise → sessionStorage (gone when the tab closes). Both can be read by any script on
// the page, so an XSS bug could leak the token. That's why I escape all API text before
// showing it, and why sessionStorage is the default.

const AUTH_KEY = "jc_auth";
let sessionExpired = false;

function saveSession(token, user, remember) {
    clearSession();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(AUTH_KEY, JSON.stringify({ token: token, user: user, remember: !!remember }));
}

// reads the JWT payload so I can check when it expires (not verifying it, the backend does that)
function readTokenPayload(token) {
    try {
        const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(part));
    } catch (e) {
        return null;
    }
}

function readSession() {
    let saved = null;
    try {
        saved = JSON.parse(sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY));
    } catch (e) {
        saved = null;
    }
    if (!saved || !saved.token) return null;

    const payload = readTokenPayload(saved.token);
    if (payload && payload.exp && payload.exp * 1000 <= Date.now()) {
        clearSession();
        sessionExpired = true;
        return null;
    }
    return saved;
}

function getToken() {
    const s = readSession();
    return s ? s.token : null;
}

function getUser() {
    const s = readSession();
    return s ? s.user : null;
}

function isLoggedIn() {
    return readSession() !== null;
}

function isAdmin() {
    const user = getUser();
    return !!user && user.role === "admin";
}

function updateStoredUser(fields) {
    const s = readSession();
    if (!s) return;
    s.user = Object.assign({}, s.user, fields);
    (s.remember ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(s));
}

// ms until the token runs out (tokens from this backend last 1 hour)
function tokenExpiresIn() {
    const token = getToken();
    const payload = token && readTokenPayload(token);
    return payload && payload.exp ? payload.exp * 1000 - Date.now() : null;
}

function clearSession() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
}

function logout(reason) {
    clearSession();
    window.location.href = pageUrl("login.html" + (reason ? "?reason=" + reason : ""));
}

// where each role lands after logging in
function homeUrl() {
    return isAdmin() ? pageUrl("admin/dashboard.html") : pageUrl("home.html");
}

// Role guards below are UX only. The backend still checks the token + role on every request.

// GUARD: any logged-in user (resident or admin). Signed-out visitors get sent to login.
function requireLogin() {
    if (isLoggedIn()) return true;
    const reason = sessionExpired ? "expired" : "login-required";
    const here = location.pathname.split("/").slice(ROOT ? -2 : -1).join("/") + location.search;
    window.location.replace(pageUrl("login.html?reason=" + reason + "&next=" + encodeURIComponent(here)));
    return false;
}

// GUARD: admin only. Residents who open an admin page get the 403 page instead.
function requireAdmin() {
    if (!requireLogin()) return false;
    if (isAdmin()) return true;
    window.location.replace(pageUrl("403.html"));
    return false;
}

// GUARD: login / signup / landing are for signed-out visitors, logged-in users go to their home
function guestOnly() {
    if (!isLoggedIn()) return true;
    window.location.replace(homeUrl());
    return false;
}

// GUARD (elements): hide controls the current role shouldn't see.
//   data-role="admin" → admins only (create/edit/delete buttons, registrants list)
//   data-role="user"  → residents only (register button, feedback form)
function applyRoleVisibility(root) {
    const user = getUser();
    $(root || document).find("[data-role]").each(function () {
        const allowed = String($(this).data("role")).split(",");
        if (!user || allowed.indexOf(user.role) === -1) $(this).remove();
    });
}
