// Shared layout: navbar, profile dropdown, footer and the admin sidebar.
// Pages have <div id="navbar"></div> and <div id="footer"></div> (or <div id="admin-sidebar"></div>).

const NAV_LINKS = [
    { href: "home.html", label: "Home" },
    { href: "events.html", label: "Events" },
    { href: "announcements.html", label: "Announcements" },
    { href: "promos.html", label: "Promos" },
    { href: "services.html", label: "Services" },
];

function currentFile() {
    return location.pathname.split("/").pop() || "index.html";
}

function logoMarkup(light) {
    return (
        '<img src="' + pageUrl(light ? "assets/logo-white.svg" : "assets/logo.svg") + '" alt="" class="size-9">' +
        '<span class="text-lg font-extrabold tracking-tight ' + (light ? "text-white" : "text-ink") + '">Jacaranda <span class="' + (light ? "text-jacaranda-light" : "text-jacaranda") + '">City</span></span>'
    );
}

function navLink(link, mobile) {
    const active = currentFile() === link.href;
    const base = mobile ? "block rounded-xl px-4 py-3 text-base" : "rounded-full px-3 py-2 text-sm";
    return '<a href="' + pageUrl(link.href) + '"' + (active ? ' aria-current="page"' : "") +
        ' class="' + base + ' font-semibold transition ' + (active ? "bg-jacaranda-mist text-jacaranda-deep" : "text-ink/80 hover:bg-ink/5 hover:text-ink") + '">' +
        escapeHtml(link.label) + "</a>";
}

function searchForm(id) {
    return (
        '<form role="search" action="' + pageUrl("events.html") + '" class="relative">' +
            '<label for="' + id + '" class="sr-only">Search events</label>' +
            '<span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">' + icon("search", "size-4") + "</span>" +
            '<input id="' + id + '" name="q" type="search" placeholder="Search events" class="input min-h-10 rounded-full py-2 pl-10 text-sm">' +
        "</form>"
    );
}

function renderNavbar() {
    const user = getUser();
    const links = NAV_LINKS.map(function (l) { return navLink(l); }).join("") +
        // admin only: the Admin link. residents never see it (and admin pages have their own guard)
        '<a data-role="admin" href="' + pageUrl("admin/dashboard.html") + '" class="rounded-full px-3 py-2 text-sm font-semibold text-jacaranda hover:bg-jacaranda-mist">Admin</a>';
    const mobileLinks = NAV_LINKS.map(function (l) { return navLink(l, true); }).join("") +
        '<a data-role="admin" href="' + pageUrl("admin/dashboard.html") + '" class="block rounded-xl px-4 py-3 text-base font-semibold text-jacaranda hover:bg-jacaranda-mist">Admin dashboard</a>';

    $("#navbar").html(
        '<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:font-semibold focus:shadow-lg">Skip to main content</a>' +
        '<header class="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">' +
            '<div class="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 sm:px-6">' +
                '<a href="' + homeUrl() + '" class="flex shrink-0 items-center gap-2" aria-label="Jacaranda City home">' + logoMarkup() + "</a>" +
                '<div class="hidden w-full max-w-xs md:block">' + searchForm("nav-search") + "</div>" +
                '<nav aria-label="Main" class="hidden items-center gap-1 xl:flex">' + links + "</nav>" +
                '<div class="ml-auto flex items-center gap-2">' +
                    '<button id="bell" type="button" class="relative grid size-11 place-items-center rounded-full border border-line bg-white text-ink hover:bg-canvas" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false" aria-controls="notification-drawer">' +
                        icon("bell", "size-5") +
                        '<span id="bell-count" hidden class="absolute -top-1 -right-1 min-w-5 rounded-full bg-sandstone px-1.5 text-center text-xs leading-5 font-bold text-ink" aria-hidden="true"></span>' +
                    "</button>" +
                    '<div class="relative">' +
                        '<button id="profile-button" type="button" class="flex min-h-11 items-center gap-2 rounded-full border border-line bg-white py-1 pr-3 pl-1 hover:bg-canvas" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu">' +
                            '<span class="grid size-9 place-items-center rounded-full bg-jacaranda-mist text-sm font-bold text-jacaranda-deep" aria-hidden="true">' + escapeHtml(initialsOf(user.full_name)) + "</span>" +
                            '<span class="hidden text-sm font-semibold sm:inline">Profile</span>' + icon("chevron-down", "size-4 text-muted") +
                        "</button>" +
                        '<div id="profile-menu" role="menu" hidden class="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl">' +
                            '<div class="border-b border-line px-4 pt-1 pb-3"><p class="truncate font-bold">' + escapeHtml(user.full_name) + '</p><p class="truncate text-sm text-muted">' + escapeHtml(user.email || "") + '</p><span class="chip mt-2 bg-jacaranda-mist text-jacaranda-deep capitalize">' + escapeHtml(user.role) + "</span></div>" +
                            '<a role="menuitem" href="' + pageUrl("profile.html") + '" class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-canvas">' + icon("user", "size-4 text-muted") + "My profile</a>" +
                            '<a role="menuitem" href="' + pageUrl("my-registrations.html") + '" class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-canvas">' + icon("ticket", "size-4 text-muted") + "My registrations</a>" +
                            '<a role="menuitem" data-role="admin" href="' + pageUrl("admin/dashboard.html") + '" class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-canvas">' + icon("layout-dashboard", "size-4 text-muted") + "Admin dashboard</a>" +
                            '<button role="menuitem" type="button" class="logout-button flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-blush/50">' + icon("log-out", "size-4") + "Log out</button>" +
                        "</div>" +
                    "</div>" +
                    '<button id="menu-button" type="button" class="grid size-11 place-items-center rounded-full border border-line bg-white xl:hidden" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">' + icon("menu", "size-5") + "</button>" +
                "</div>" +
            "</div>" +
            '<nav id="mobile-menu" aria-label="Mobile" hidden class="border-t border-line bg-white px-4 py-4 xl:hidden">' +
                '<div class="mb-3 md:hidden">' + searchForm("mobile-search") + "</div>" + mobileLinks +
            "</nav>" +
        "</header>"
    );

    applyRoleVisibility($("#navbar"));
    bindNavbar();
    loadBellCount();
    scheduleAutoLogout();
}

function bindNavbar() {
    const $button = $("#profile-button");
    const $menu = $("#profile-menu");

    function closeMenu() {
        $menu.prop("hidden", true);
        $button.attr("aria-expanded", "false");
    }

    $button.on("click", function (e) {
        e.stopPropagation();
        const opening = $menu.prop("hidden");
        $menu.prop("hidden", !opening);
        $button.attr("aria-expanded", String(opening));
        if (opening) $menu.find("[role=menuitem]").first().trigger("focus");
    });
    $(document).on("click", closeMenu);
    $(document).on("keydown", function (e) {
        if (e.key === "Escape" && !$menu.prop("hidden")) {
            closeMenu();
            $button.trigger("focus");
        }
    });
    // arrow keys move through the menu
    $menu.on("keydown", function (e) {
        const $items = $menu.find("[role=menuitem]");
        const index = $items.index(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); $items.eq((index + 1) % $items.length).trigger("focus"); }
        if (e.key === "ArrowUp") { e.preventDefault(); $items.eq((index - 1 + $items.length) % $items.length).trigger("focus"); }
    });

    $("#menu-button").on("click", function () {
        const $mobile = $("#mobile-menu");
        const opening = $mobile.prop("hidden");
        $mobile.prop("hidden", !opening);
        $(this).attr("aria-expanded", String(opening)).attr("aria-label", opening ? "Close menu" : "Open menu")
            .html(icon(opening ? "x" : "menu", "size-5"));
    });

    $(".logout-button").on("click", function () { logout("signed-out"); });
    $("#bell").on("click", openDrawer);

    const q = new URLSearchParams(location.search).get("q");
    if (q) $("#nav-search, #mobile-search").val(q);
}

/* notifications: shared by the bell drawer, the inbox, the detail page and the admin list */

const NOTIFICATION_TYPES = {
    event: { label: "Event", action: "View event" },
    announcement: { label: "Audio", action: "Listen" },
    promo: { label: "Video", action: "Watch" },
};

function notificationType(n) {
    return NOTIFICATION_TYPES[n.type] || { label: n.type ? n.type.charAt(0).toUpperCase() + n.type.slice(1) : "Update", action: "Open" };
}

// the button on a notification goes to whatever its metadata points at
function relatedLink(n) {
    const m = n.metadata || {};
    const action = notificationType(n).action;
    if (m.event_id) return { href: pageUrl("event.html?id=" + m.event_id), label: action };
    if (m.announcement_id) return { href: pageUrl("announcement.html?id=" + m.announcement_id), label: action };
    if (m.promo_id) return { href: pageUrl("promo.html?id=" + m.promo_id), label: action };
    return null;
}

// the backend's "read" column is one value for everyone, so I keep each person's read list in the browser
function readKey() {
    return "jc_read_" + ((getUser() || {}).id || "guest");
}
function readIds() {
    try { return JSON.parse(localStorage.getItem(readKey()) || "[]"); } catch (e) { return []; }
}
function isRead(n) {
    return readIds().indexOf(n.id) !== -1;
}
function markRead(ids) {
    const saved = readIds();
    ids.forEach(function (id) { if (saved.indexOf(id) === -1) saved.push(id); });
    try { localStorage.setItem(readKey(), JSON.stringify(saved)); } catch (e) { /* private mode, oh well */ }
    loadBellCount();
}

// GET /notifications already returns broadcasts + the ones sent to me, newest first
function loadNotifications() {
    return apiGet("/notifications").then(function (res) {
        return (res.data || []).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    });
}

function loadBellCount() {
    loadNotifications().then(function (list) {
        const unread = list.filter(function (n) { return !isRead(n); }).length;
        $("#bell-count").text(unread > 99 ? "99+" : unread).prop("hidden", unread === 0);
        $("#bell").attr("aria-label", "Notifications, " + unread + " unread");
    }).catch(function () {
        // the bell isn't important enough to show an error for
    });
}

// "09:14" today, "Yesterday", otherwise "Fri 20 Nov"
function notificationTime(iso) {
    const days = -daysUntil(iso);
    if (days === 0) return formatTime(iso);
    if (days === 1) return "Yesterday";
    return formatDay(iso);
}

function logoAvatar(small) {
    return '<span class="grid shrink-0 place-items-center rounded-full bg-jacaranda ' + (small ? "size-9" : "size-11") + '" aria-hidden="true">' +
        '<img src="' + pageUrl("assets/logo-white.svg") + '" alt="" class="' + (small ? "size-6" : "size-7") + '"></span>';
}

// one chat bubble from the city. compact = the small version in the bell drawer
function notificationBubble(n, compact) {
    const unread = !isRead(n);
    const detailUrl = pageUrl("notification.html?id=" + n.id);
    const box = "rounded-2xl rounded-tl-md border " + (unread ? "border-jacaranda/60 bg-white ring-1 ring-jacaranda/30" : "border-line bg-white");

    if (compact) {
        return '<li class="flex items-start gap-3">' + logoAvatar(true) +
            '<a href="' + detailUrl + '" class="block min-w-0 flex-1 px-4 py-3 transition hover:bg-jacaranda-mist ' + box + '">' +
                '<span class="block font-bold leading-snug">' + escapeHtml(n.title) + "</span>" +
                '<span class="eyebrow mt-1 flex items-center gap-1.5 text-muted">' + escapeHtml(notificationTime(n.created_at)) +
                    (unread ? '<span class="size-2 rounded-full bg-sandstone" aria-hidden="true"></span><span class="sr-only">, unread</span>' : "") +
                "</span>" +
            "</a></li>";
    }

    const link = relatedLink(n);
    return '<li class="flex items-start gap-3" data-id="' + n.id + '">' + logoAvatar() +
        '<article class="min-w-0 max-w-xl flex-1 p-4 sm:p-5 ' + box + '">' +
            '<div class="flex flex-wrap items-center gap-2">' +
                '<h3 class="font-bold"><a href="' + detailUrl + '" class="hover:text-jacaranda">' + escapeHtml(n.title) + "</a></h3>" +
                '<span class="chip bg-jacaranda-mist text-jacaranda-deep">' + escapeHtml(notificationType(n).label) + "</span>" +
            "</div>" +
            '<p class="mt-1 text-ink/80">' + escapeHtml(n.message) + "</p>" +
            (link ? '<a href="' + link.href + '" class="btn-primary mt-3 min-h-10">' + escapeHtml(link.label) + icon("arrow-right", "size-4") + "</a>" : "") +
            '<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">' +
                '<p class="eyebrow flex items-center gap-1.5 text-muted">' + escapeHtml(notificationTime(n.created_at)) +
                    (unread ? ' · unread <span class="size-2 rounded-full bg-sandstone" aria-hidden="true"></span>' : "") + "</p>" +
                // admin only: delete straight from the inbox. backend checks the role too
                '<button data-role="admin" type="button" class="delete-notification text-sm font-semibold text-danger underline-offset-4 hover:underline" data-id="' + n.id + '">Delete</button>' +
            "</div>" +
        "</article></li>";
}

// admin only: delete with a confirm first. returns a promise: true if it was deleted
function deleteNotification(n) {
    return confirmDialog({
        title: "Delete this notification?",
        message: "\"" + n.title + "\" disappears from everyone's inbox. This can't be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        danger: true,
    }).then(function (ok) {
        if (!ok) return false;
        return apiDelete("/notifications/" + n.id).then(function () {
            showToast("Notification deleted.", "success");
            loadBellCount();
            return true;
        }).catch(function (err) {
            showToast(err.message, "error");
            return false;
        });
    });
}

/* the bell drawer: slides in from the right. Esc / the X / clicking outside closes it, focus stays inside */
function openDrawer() {
    if (!$("#notification-drawer").length) buildDrawer();
    const $drawer = $("#notification-drawer").prop("hidden", false);
    $("#bell").attr("aria-expanded", "true");
    $("body").addClass("overflow-hidden");
    $drawer.find(".drawer-close").trigger("focus");
    fillDrawer();
}

function closeDrawer() {
    $("#notification-drawer").prop("hidden", true);
    $("#bell").attr("aria-expanded", "false").trigger("focus");
    $("body").removeClass("overflow-hidden");
}

function buildDrawer() {
    $("body").append(
        '<div id="notification-drawer" hidden class="fixed inset-0 z-50">' +
            '<div class="drawer-backdrop absolute inset-0 bg-ink/40 backdrop-blur-[2px]"></div>' +
            '<section role="dialog" aria-modal="true" aria-labelledby="drawer-title" class="absolute top-0 right-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">' +
                '<div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4">' +
                    '<div><h2 id="drawer-title" class="text-lg font-bold">Notifications</h2><p id="drawer-unread" class="eyebrow mt-0.5 text-muted"></p></div>' +
                    '<button type="button" class="drawer-close grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label="Close notifications">' + icon("x", "size-5") + "</button>" +
                "</div>" +
                '<ul id="drawer-list" class="flex-1 space-y-3 overflow-y-auto bg-jacaranda-mist/40 p-4" aria-busy="true"></ul>' +
                '<div class="flex items-center justify-between gap-3 border-t border-line px-5 py-4">' +
                    '<button type="button" class="drawer-mark-all btn-ghost min-h-10 px-3">' + icon("check-check", "size-4") + "Mark all as read</button>" +
                    '<a href="' + pageUrl("notifications.html") + '" class="font-semibold text-jacaranda-deep underline underline-offset-4 hover:text-jacaranda">See all</a>' +
                "</div>" +
            "</section>" +
        "</div>"
    );
    const $drawer = $("#notification-drawer");
    $drawer.find(".drawer-close, .drawer-backdrop").on("click", closeDrawer);
    $drawer.find(".drawer-mark-all").on("click", function () {
        markRead($drawer.data("ids") || []);
        fillDrawer();
    });
    $drawer.on("keydown", function (e) {
        if (e.key === "Escape") { closeDrawer(); return; }
        if (e.key !== "Tab") return;
        // keep Tab inside the drawer while it's open
        const $focusable = $drawer.find("a[href], button:not([disabled])").filter(":visible");
        const first = $focusable.first()[0];
        const last = $focusable.last()[0];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
}

function fillDrawer() {
    const $list = $("#drawer-list").attr("aria-busy", "true").html(
        '<li class="skeleton h-16 rounded-2xl"></li><li class="skeleton h-16 rounded-2xl"></li><li class="skeleton h-16 rounded-2xl"></li>'
    );
    loadNotifications()
        .then(function (list) {
            $("#notification-drawer").data("ids", list.map(function (n) { return n.id; }));
            const unread = list.filter(function (n) { return !isRead(n); }).length;
            $("#drawer-unread").text(unread + " unread");
            $list.attr("aria-busy", "false");
            if (!list.length) {
                $list.html('<li class="py-10 text-center text-muted">' + icon("bell-off", "mx-auto mb-2 size-6") + "Nothing yet. City updates will show up here.</li>");
                return;
            }
            $list.html(list.slice(0, 6).map(function (n) { return notificationBubble(n, true); }).join(""));
        })
        .catch(function (err) {
            $list.attr("aria-busy", "false").html('<li class="rounded-2xl bg-blush/50 p-4 text-sm font-semibold text-danger" role="alert">' + escapeHtml("Couldn't load notifications. " + err.message) + "</li>");
        });
}

// token lasts 1 hour, so sign out the moment it runs out even if the page is just sitting open
function scheduleAutoLogout() {
    const ms = tokenExpiresIn();
    if (ms && ms > 0 && ms < 2147483647) setTimeout(function () { logout("expired"); }, ms);
}

function renderFooter() {
    const explore = ["events.html|Events", "announcements.html|Announcements", "promos.html|Promos", "services.html|Services"];
    $("#footer").html(
        '<footer class="mt-20 bg-ink text-canvas/80">' +
            '<div class="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">' +
                '<div><a href="' + pageUrl("index.html") + '" class="inline-flex items-center gap-2">' + logoMarkup(true) + "</a>" +
                    '<p class="mt-4 max-w-xs">Events, announcements and city updates for everyone in Pretoria.</p></div>' +
                footerColumn("Explore", explore.map(function (item) {
                    const parts = item.split("|");
                    return '<a class="hover:text-white hover:underline" href="' + pageUrl(parts[0]) + '">' + parts[1] + "</a>";
                })) +
                footerColumn("Help", [
                    '<a class="hover:text-white hover:underline" href="mailto:help@jacarandacity.test">Contact the city</a>',
                    '<a class="hover:text-white hover:underline" href="mailto:help@jacarandacity.test?subject=Accessibility">Accessibility</a>',
                    '<a class="hover:text-white hover:underline" href="mailto:help@jacarandacity.test?subject=Question">FAQs</a>',
                ]) +
                footerColumn("Contact", [
                    '<a class="hover:text-white hover:underline" href="mailto:help@jacarandacity.test">help@jacarandacity.test</a>',
                    '<a class="hover:text-white hover:underline" href="tel:+27120000000">+27 12 000 0000</a>',
                    "<span>Pretoria, Gauteng</span>",
                ]) +
            "</div>" +
            '<div class="mx-auto flex max-w-7xl flex-col gap-2 border-t border-white/10 px-4 py-6 text-sm text-canvas/60 sm:flex-row sm:justify-between sm:px-6">' +
                "<p>&copy; " + new Date().getFullYear() + " Jacaranda City. Student project.</p>" +
                '<p>Hero photo: <a class="underline hover:text-white" href="https://unsplash.com/@kuhlebaloyi" rel="noopener" target="_blank">Kuhle Baloyi on Unsplash</a></p>' +
            "</div>" +
        "</footer>"
    );
}

function footerColumn(title, items) {
    return '<div><h2 class="eyebrow text-jacaranda-light">' + title + '</h2><ul class="mt-4 space-y-3">' +
        items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div>";
}

/* admin sidebar (ink background), used on every page in /admin */
const ADMIN_LINKS = [
    { group: "Overview", items: [{ key: "dashboard", href: "admin/dashboard.html", label: "Dashboard", icon: "layout-dashboard" }] },
    { group: "Content", items: [
        { key: "events", href: "admin/events.html", label: "Events", icon: "calendar-days" },
        { key: "announcements", href: "announcements.html", label: "Announcements", icon: "megaphone" },
        { key: "promos", href: "promos.html", label: "Promos", icon: "clapperboard" },
    ] },
    { group: "People", items: [
        { key: "users", href: "admin/users.html", label: "Users", icon: "users" },
        { key: "notifications", href: "admin/notifications.html", label: "Notifications", icon: "send" },
        { key: "services", href: "admin/service-requests.html", label: "Service requests", icon: "wrench" },
    ] },
    { group: "Site", items: [{ key: "site", href: "home.html", label: "View public site", icon: "globe" }] },
];

function renderAdminSidebar(activeKey) {
    const user = getUser();
    const groups = ADMIN_LINKS.map(function (group) {
        return '<p class="eyebrow mt-6 mb-2 px-3 text-canvas/50">' + group.group + "</p>" +
            group.items.map(function (item) {
                const active = item.key === activeKey;
                return '<a href="' + pageUrl(item.href) + '"' + (active ? ' aria-current="page"' : "") +
                    ' class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ' +
                    (active ? "bg-jacaranda text-white" : "text-canvas/80 hover:bg-white/5 hover:text-white") + '">' +
                    icon(item.icon, "size-5") + escapeHtml(item.label) + "</a>";
            }).join("");
    }).join("");

    $("#admin-sidebar").html(
        '<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:font-semibold focus:text-ink">Skip to main content</a>' +
        // small screens: a top bar with a menu button instead of the full sidebar
        '<div class="flex items-center justify-between bg-ink px-4 py-3 lg:hidden">' +
            '<a href="' + pageUrl("admin/dashboard.html") + '" class="flex items-center gap-2">' + logoMarkup(true) + "</a>" +
            '<button id="admin-menu-button" type="button" class="grid size-11 place-items-center rounded-full bg-white/10 text-white" aria-expanded="false" aria-controls="admin-nav" aria-label="Open admin menu">' + icon("menu", "size-5") + "</button>" +
        "</div>" +
        '<aside id="admin-nav" class="hidden flex-col bg-ink p-4 text-canvas lg:sticky lg:top-0 lg:flex lg:h-screen" aria-label="Admin">' +
            '<div class="hidden items-center gap-3 rounded-2xl bg-slate p-3 lg:flex">' +
                '<img src="' + pageUrl("assets/logo-white.svg") + '" alt="" class="size-10">' +
                '<div><p class="font-extrabold text-white">Jacaranda City</p><p class="text-sm text-canvas/60">Admin</p></div>' +
            "</div>" +
            '<nav class="flex-1 overflow-y-auto">' + groups + "</nav>" +
            '<div class="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">' +
                '<span class="grid size-10 shrink-0 place-items-center rounded-full bg-jacaranda-mist text-sm font-bold text-jacaranda-deep" aria-hidden="true">' + escapeHtml(initialsOf(user.full_name)) + "</span>" +
                '<div class="min-w-0 flex-1"><p class="truncate text-sm font-bold text-white">' + escapeHtml(user.full_name) + '</p><p class="truncate text-xs text-canvas/60">' + escapeHtml(user.email || "") + "</p></div>" +
                '<button type="button" class="logout-button rounded-full px-3 py-2 text-sm text-canvas/80 hover:bg-white/10 hover:text-white">Log out</button>' +
            "</div>" +
        "</aside>"
    );

    $("#admin-menu-button").on("click", function () {
        const $nav = $("#admin-nav");
        const opening = $nav.hasClass("hidden");
        $nav.toggleClass("hidden flex", false).addClass(opening ? "flex" : "hidden");
        $(this).attr("aria-expanded", String(opening)).html(icon(opening ? "x" : "menu", "size-5"));
    });
    $(".logout-button").on("click", function () { logout("signed-out"); });
    scheduleAutoLogout();
}
