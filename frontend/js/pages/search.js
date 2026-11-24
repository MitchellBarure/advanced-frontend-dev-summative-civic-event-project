// Global search. The backend has no search endpoint, so I load events, announcements and
// promos once and filter them here in the browser.
let searchData = null;
let searchTimer = null;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();

    const q = new URLSearchParams(location.search).get("q") || "";
    $("#search-input, #nav-search, #mobile-search").val(q);

    $("#search-form").on("submit", function (e) {
        e.preventDefault();
        runSearch();
    });
    // search as you type, but wait a moment so it doesn't redraw on every key
    $("#search-input").on("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(runSearch, 250);
    });

    loadSearchData();
});

function loadSearchData() {
    $("#search-summary").text("Loading…");
    $("#search-results").attr("aria-busy", "true").html(skeletonRows(4));

    Promise.all([apiGet("/events"), apiGet("/announcements", { limit: 100 }), getPromos()])
        .then(function (results) {
            // residents only search published content. admins search drafts too
            const visible = function (item) { return isAdmin() || item.published !== false; };
            searchData = {
                events: (results[0].data || []).filter(visible),
                announcements: (results[1].data || []).filter(visible),
                promos: (results[2] || []).filter(visible),
            };
            runSearch();
        })
        .catch(function (err) {
            $("#search-summary").text("");
            showError($("#search-results"), "Couldn't load content to search. " + err.message, loadSearchData);
        });
}

// every word has to appear somewhere in the item, so "night market" finds "Jacaranda Night Market"
function matches(fields, words) {
    const text = fields.join(" ").toLowerCase();
    return words.every(function (w) { return text.indexOf(w) !== -1; });
}

function runSearch() {
    if (!searchData) return;
    const q = $("#search-input").val().trim();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);

    // keep the address bar in sync so the results can be shared or refreshed
    history.replaceState(null, "", q ? "search.html?q=" + encodeURIComponent(q) : "search.html");
    $("#nav-search, #mobile-search").val(q);
    document.title = (q ? "“" + q + "” · " : "") + "Search · Jacaranda City";

    const $results = $("#search-results").attr("aria-busy", "false");
    if (!words.length) {
        $("#search-summary").text("Type something to search");
        $results.html(emptyState("Search everything", "Find events, audio announcements and promo videos by name, place or description."));
        return;
    }

    const events = searchData.events.filter(function (e) { return matches([e.title, e.description, e.location], words); }).sort(byStartDate);
    const announcements = searchData.announcements.filter(function (a) { return matches([a.title, a.transcript], words); });
    const promos = searchData.promos.filter(function (p) { return matches([p.title, p.description, p.caption_text], words); });
    const total = events.length + announcements.length + promos.length;

    $("#search-summary").text(total + (total === 1 ? " result" : " results") + " for “" + q + "”");
    if (!total) {
        $results.html(emptyState("Nothing found for “" + q + "”", "Check the spelling, or try a shorter word like a place name."));
        return;
    }

    $results.html(
        resultGroup("Events", "calendar-days", events.map(function (e) {
            return resultRow("event.html?id=" + e.id, e.title, formatDay(e.starts_at) + " · " + formatTime(e.starts_at) + " · " + (e.location || "Pretoria"), e.description, e);
        }), "events.html?q=" + encodeURIComponent(q), "See all events") +
        resultGroup("Announcements", "audio-lines", announcements.map(function (a) {
            return resultRow("announcement.html?id=" + a.id, a.title, "Audio · " + formatWith(a.created_at, { day: "numeric", month: "short", year: "numeric" }), "", a);
        })) +
        resultGroup("Promos", "clapperboard", promos.map(function (p) {
            return resultRow("promo.html?id=" + p.id, p.title, "Video" + (p.caption_text ? " · captions" : ""), p.description, p);
        }))
    );
}

function resultGroup(title, iconName, rows, moreUrl, moreLabel) {
    if (!rows.length) return "";
    return '<section aria-label="' + title + '">' +
        '<div class="flex items-center justify-between gap-3 border-b border-line pb-3">' +
            '<h2 class="flex items-center gap-2 text-2xl tracking-tight"><span class="text-jacaranda">' + icon(iconName, "size-5") + "</span>" + title +
                ' <span class="font-sans text-base font-semibold text-muted">(' + rows.length + ")</span></h2>" +
            (moreUrl ? '<a href="' + moreUrl + '" class="text-sm font-semibold text-jacaranda-deep underline underline-offset-4 hover:text-jacaranda">' + moreLabel + "</a>" : "") +
        "</div>" +
        '<ul class="divide-y divide-line">' + rows.join("") + "</ul>" +
    "</section>";
}

function resultRow(href, title, meta, text, item) {
    // admin only: drafts show up in admin searches, so label them
    const draft = item.published === false ? ' <span class="chip ml-1 bg-sandstone-soft align-middle text-ink">Draft</span>' : "";
    return '<li class="py-4">' +
        '<a href="' + href + '" class="group block rounded-xl">' +
            '<p class="text-lg font-bold group-hover:text-jacaranda">' + escapeHtml(title) + draft + "</p>" +
            '<p class="eyebrow mt-1 text-muted">' + escapeHtml(meta) + "</p>" +
            (text ? '<p class="mt-1 line-clamp-2 text-muted">' + escapeHtml(text) + "</p>" : "") +
        "</a></li>";
}
