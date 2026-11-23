// GET /api/events returns everything in one go (no paging or filters on the backend),
// so search, filters and pagination all happen here in the browser.
const PER_PAGE = 6;
let allEvents = [];
let registeredIds = [];
let currentPage = 1;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    applyRoleVisibility(); // admin only: hides "+ New event" for residents
    fillIcons();
    showFlash();

    const q = new URLSearchParams(location.search).get("q");
    if (q) $("#search").val(q);

    $("#search").on("input", function () { currentPage = 1; renderEvents(); });
    $("#date-filter, #location-filter").on("change", function () { currentPage = 1; renderEvents(); });
    $("#filters").on("submit", function (e) { e.preventDefault(); });
    $("#clear-filters").on("click", clearFilters);

    bindRegisterButtons($("#event-grid"), function (id) { registeredIds.push(id); });

    // admin only: delete from the card (the button only exists for admins)
    $("#event-grid").on("click", ".delete-event-button", function () {
        deleteEvent($(this).data("id"), $(this).data("title")).then(function (deleted) {
            if (deleted) loadEvents();
        });
    });
    $("#pagination").on("click", "button[data-page]", function () {
        currentPage = Number($(this).data("page"));
        renderEvents();
        $("html, body").animate({ scrollTop: $("#filters").offset().top - 100 }, 200);
    });

    loadEvents();
});

function loadEvents() {
    $("#event-grid").html(skeletonCards(6)).attr("aria-busy", "true");
    $("#pagination").empty();

    Promise.all([apiGet("/events"), getMyRegistrations().catch(function () { return []; })])
        .then(function (results) {
            // residents only ever see published events, even admins here (drafts live in the admin table)
            allEvents = (results[0].data || []).filter(isPublished);
            registeredIds = results[1].map(function (r) { return r.event_id; });
            fillLocationFilter();
            renderEvents();
        })
        .catch(function (err) {
            $("#event-count").text("");
            showError($("#event-grid"), "Couldn't load events. " + err.message, loadEvents);
        });
}

function fillLocationFilter() {
    const $select = $("#location-filter");
    const chosen = $select.val();
    const locations = [];
    allEvents.forEach(function (e) {
        if (e.location && locations.indexOf(e.location) === -1) locations.push(e.location);
    });
    locations.sort();
    $select.html('<option value="">Any location</option>' + locations.map(function (l) {
        return '<option value="' + escapeHtml(l) + '">' + escapeHtml(l) + "</option>";
    }).join("")).val(chosen || "");
}

function matchesDate(event, filter) {
    const start = new Date(event.starts_at);
    const now = new Date();
    const dayMs = 86400000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === "any") return true;
    if (filter === "past") return isPast(event);
    if (isPast(event)) return false;
    if (filter === "upcoming") return true;
    if (filter === "today") return start < new Date(startOfToday.getTime() + dayMs);
    if (filter === "week") return start < new Date(now.getTime() + 7 * dayMs);
    if (filter === "month") return start < new Date(now.getTime() + 30 * dayMs);
    if (filter === "weekend") {
        // coming Saturday 00:00 until Monday 00:00 (or this weekend if it's already Sat/Sun)
        const day = startOfToday.getDay();
        const toSaturday = day === 0 ? -1 : 6 - day;
        const saturday = new Date(startOfToday.getTime() + toSaturday * dayMs);
        const monday = new Date(saturday.getTime() + 2 * dayMs);
        return start >= saturday && start < monday;
    }
    return true;
}

function filteredEvents() {
    const search = $("#search").val().trim().toLowerCase();
    const dateFilter = $("#date-filter").val();
    const location = $("#location-filter").val();

    return allEvents.filter(function (e) {
        const text = (e.title + " " + (e.description || "") + " " + (e.location || "")).toLowerCase();
        return (!search || text.indexOf(search) !== -1) &&
            (!location || e.location === location) &&
            matchesDate(e, dateFilter);
    }).sort(function (a, b) {
        // past events: newest first. everything else: soonest first
        return dateFilterIsPast() ? byStartDate(b, a) : byStartDate(a, b);
    });
}

function dateFilterIsPast() {
    return $("#date-filter").val() === "past";
}

function renderEvents() {
    const events = filteredEvents();
    const pages = Math.max(1, Math.ceil(events.length / PER_PAGE));
    if (currentPage > pages) currentPage = pages;

    $("#event-count").text(events.length + (events.length === 1 ? " event" : " events") + " in Pretoria");
    const $grid = $("#event-grid").attr("aria-busy", "false");

    if (!events.length) {
        $grid.html(emptyState(
            allEvents.length ? "No events match your search" : "No events yet",
            allEvents.length ? "Try a different word, date or location." : "Check back soon, the city adds new events all the time.",
            allEvents.length ? '<button type="button" class="btn-secondary" id="empty-clear">Clear filters</button>' : ""
        ));
        $("#empty-clear").on("click", clearFilters);
        $("#pagination").empty();
        return;
    }

    const pageItems = events.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    $grid.html(pageItems.map(function (e) {
        return eventCard(e, { registered: registeredIds.indexOf(e.id) !== -1 });
    }).join(""));
    applyRoleVisibility($grid); // register for residents, edit/delete for admins
    renderPagination(pages);
}

function renderPagination(pages) {
    const $nav = $("#pagination");
    if (pages <= 1) { $nav.empty(); return; }

    let html = '<button type="button" class="btn-secondary" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? " disabled" : "") + ">" + icon("arrow-left", "size-4") + "Prev</button>";
    for (let p = 1; p <= pages; p++) {
        const active = p === currentPage;
        html += '<button type="button" data-page="' + p + '" class="grid size-11 place-items-center rounded-full text-sm font-bold ' +
            (active ? "bg-jacaranda text-white" : "border border-ink/20 bg-white hover:bg-canvas") + '"' +
            (active ? ' aria-current="page"' : "") + ' aria-label="Page ' + p + '">' + p + "</button>";
    }
    html += '<button type="button" class="btn-secondary" data-page="' + (currentPage + 1) + '"' + (currentPage === pages ? " disabled" : "") + ">Next" + icon("arrow-right", "size-4") + "</button>";
    $nav.html(html);
}

function clearFilters() {
    $("#search").val("");
    $("#date-filter").val("upcoming");
    $("#location-filter").val("");
    currentPage = 1;
    renderEvents();
    $("#search").trigger("focus");
}
