const ADMIN_PER_PAGE = 8;
let adminEvents = [];
let registrationCounts = {};
let statusFilter = "all";
let adminPage = 1;

$(function () {
    // admin only page. residents get bounced to 403.html, and the API would refuse them anyway
    if (!requireAdmin()) return;
    renderAdminSidebar("events");
    fillIcons();
    showFlash();

    $(".status-tab").on("click", function () {
        statusFilter = $(this).data("status");
        adminPage = 1;
        renderTable();
    });
    // arrow keys move between the tabs
    $(".status-tab").on("keydown", function (e) {
        const $tabs = $(".status-tab");
        const i = $tabs.index(this);
        if (e.key === "ArrowRight") $tabs.eq((i + 1) % $tabs.length).trigger("focus").trigger("click");
        if (e.key === "ArrowLeft") $tabs.eq((i - 1 + $tabs.length) % $tabs.length).trigger("focus").trigger("click");
    });
    $("#admin-search").on("input", function () { adminPage = 1; renderTable(); });
    $("#event-rows").on("click", ".delete-event-button", function () {
        deleteEvent($(this).data("id"), $(this).data("title")).then(function (deleted) {
            if (deleted) loadAdminEvents();
        });
    });
    $("#admin-pagination").on("click", "button[data-page]", function () {
        adminPage = Number($(this).data("page"));
        renderTable();
    });

    loadAdminEvents();
});

function loadAdminEvents() {
    let skeleton = "";
    for (let i = 0; i < 5; i++) {
        skeleton += '<tr aria-hidden="true"><td class="px-5 py-4" colspan="6"><div class="flex items-center gap-4"><div class="skeleton size-14 rounded-xl"></div><div class="skeleton h-5 flex-1"></div></div></td></tr>';
    }
    $("#event-rows").html(skeleton);

    apiGet("/events")
        .then(function (res) {
            adminEvents = (res.data || []).sort(function (a, b) { return byStartDate(b, a); });
            renderTable();
            loadRegistrationCounts();
        })
        .catch(function (err) {
            $("#event-rows").html('<tr><td colspan="6" class="p-4"><div id="table-error"></div></td></tr>');
            showError($("#table-error"), "Couldn't load events. " + err.message, loadAdminEvents);
        });
}

// no "count" endpoint, so I ask for each event's attendees and count them
function loadRegistrationCounts() {
    adminEvents.forEach(function (e) {
        apiGet("/event-registrations/event/" + e.id + "/attendees")
            .then(function (res) {
                registrationCounts[e.id] = (res.data || []).length;
                $('[data-count-for="' + e.id + '"]').text(registrationCounts[e.id]);
            })
            .catch(function () {
                $('[data-count-for="' + e.id + '"]').text("–");
            });
    });
}

function renderTable() {
    const search = $("#admin-search").val().trim().toLowerCase();
    const published = adminEvents.filter(isPublished);

    // tab labels with counts
    const counts = { all: adminEvents.length, published: published.length, draft: adminEvents.length - published.length };
    const labels = { all: "All", published: "Published", draft: "Drafts" };
    $(".status-tab").each(function () {
        const status = $(this).data("status");
        const selected = status === statusFilter;
        $(this).attr("aria-selected", String(selected)).attr("tabindex", selected ? "0" : "-1")
            .attr("class", "status-tab btn " + (selected ? "bg-ink text-white" : "border border-ink/20 bg-white text-ink hover:bg-canvas"))
            .text(labels[status] + " (" + counts[status] + ")");
    });

    const rows = adminEvents.filter(function (e) {
        if (statusFilter === "published" && !isPublished(e)) return false;
        if (statusFilter === "draft" && isPublished(e)) return false;
        return !search || (e.title + " " + (e.location || "")).toLowerCase().indexOf(search) !== -1;
    });

    const pages = Math.max(1, Math.ceil(rows.length / ADMIN_PER_PAGE));
    if (adminPage > pages) adminPage = pages;
    const start = (adminPage - 1) * ADMIN_PER_PAGE;
    const pageRows = rows.slice(start, start + ADMIN_PER_PAGE);

    if (!rows.length) {
        $("#event-rows").html('<tr><td colspan="6" class="p-4">' + emptyState(
            adminEvents.length ? "No events match" : "No events yet",
            adminEvents.length ? "Try another search or status." : "Create the first one and it'll show up here.",
            adminEvents.length ? "" : '<a href="event-form.html" class="btn-primary">' + icon("plus", "size-4") + "New event</a>"
        ) + "</td></tr>");
        $("#showing").text("");
        $("#admin-pagination").empty();
        return;
    }

    $("#event-rows").html(pageRows.map(function (e) {
        const count = registrationCounts[e.id];
        return "<tr>" +
            '<td class="px-5 py-3"><div class="flex items-center gap-4">' +
                '<div class="size-14 shrink-0 overflow-hidden rounded-xl">' + eventImage(e, "size-14") + "</div>" +
                '<a href="../event.html?id=' + e.id + '" class="font-bold hover:text-jacaranda">' + escapeHtml(e.title) + "</a>" +
            "</div></td>" +
            '<td class="px-5 py-3 whitespace-nowrap">' + escapeHtml(formatDay(e.starts_at)) + '<span class="block text-sm text-muted">' + escapeHtml(formatTime(e.starts_at)) + "</span></td>" +
            '<td class="px-5 py-3">' + escapeHtml(e.location || "") + "</td>" +
            '<td class="px-5 py-3">' + (isPublished(e) ? '<span class="chip bg-leaf-soft text-leaf">Published</span>' : '<span class="chip bg-ink/5 text-muted">Draft</span>') + "</td>" +
            '<td class="px-5 py-3 font-semibold tabular-nums" data-count-for="' + e.id + '">' + (count == null ? "…" : count) + "</td>" +
            '<td class="px-5 py-3"><div class="flex justify-end gap-1">' +
                '<a href="event-form.html?id=' + e.id + '" class="btn-ghost min-h-10 px-3">' + icon("pencil", "size-4") + 'Edit<span class="sr-only"> ' + escapeHtml(e.title) + "</span></a>" +
                '<button type="button" class="btn-ghost delete-event-button min-h-10 px-3 text-danger hover:bg-blush/60" data-id="' + e.id + '" data-title="' + escapeHtml(e.title) + '">' + icon("trash-2", "size-4") + 'Delete<span class="sr-only"> ' + escapeHtml(e.title) + "</span></button>" +
            "</div></td>" +
        "</tr>";
    }).join(""));

    $("#showing").text("Showing " + (start + 1) + "–" + (start + pageRows.length) + " of " + rows.length);
    renderAdminPagination(pages);
}

function renderAdminPagination(pages) {
    if (pages <= 1) { $("#admin-pagination").empty(); return; }
    let html = '<button type="button" class="btn-ghost min-h-10 px-3" data-page="' + (adminPage - 1) + '"' + (adminPage === 1 ? " disabled" : "") + ">" + icon("chevron-left", "size-4") + "Prev</button>";
    for (let p = 1; p <= pages; p++) {
        html += '<button type="button" data-page="' + p + '" aria-label="Page ' + p + '"' + (p === adminPage ? ' aria-current="page"' : "") +
            ' class="grid size-10 place-items-center rounded-full text-sm font-bold ' + (p === adminPage ? "bg-ink text-white" : "hover:bg-ink/5") + '">' + p + "</button>";
    }
    html += '<button type="button" class="btn-ghost min-h-10 px-3" data-page="' + (adminPage + 1) + '"' + (adminPage === pages ? " disabled" : "") + ">Next" + icon("chevron-right", "size-4") + "</button>";
    $("#admin-pagination").html(html);
}
