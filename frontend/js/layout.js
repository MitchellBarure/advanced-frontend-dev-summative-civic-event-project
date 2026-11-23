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
                    '<a href="' + pageUrl("notifications.html") + '" id="bell" class="relative grid size-11 place-items-center rounded-full border border-line bg-white text-ink hover:bg-canvas" aria-label="Notifications">' +
                        icon("bell", "size-5") +
                        '<span id="bell-count" hidden class="absolute -top-1 -right-1 min-w-5 rounded-full bg-sandstone px-1.5 text-center text-xs leading-5 font-bold text-ink"></span>' +
                    "</a>" +
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

    const q = new URLSearchParams(location.search).get("q");
    if (q) $("#nav-search, #mobile-search").val(q);
}

function loadBellCount() {
    apiGet("/notifications").then(function (res) {
        const unread = (res.data || []).filter(function (n) { return !n.read; }).length;
        $("#bell-count").text(unread > 99 ? "99+" : unread).prop("hidden", unread === 0);
        $("#bell").attr("aria-label", "Notifications, " + unread + " unread");
    }).catch(function () {
        // the bell isn't important enough to show an error for
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
