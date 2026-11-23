let registrations = [];
let activeTab = "upcoming";

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    showFlash();

    $(".tab").on("click", function () { selectTab($(this).data("tab")); });
    // left / right arrows move between the tabs
    $(".tab").on("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            selectTab(activeTab === "upcoming" ? "past" : "upcoming");
            $("#tab-" + activeTab).trigger("focus");
        }
    });

    $("#registration-list").on("click", ".cancel-button", function () {
        cancelRegistration($(this));
    });

    loadRegistrations();
});

function loadRegistrations() {
    $("#registration-list").html('<div class="card divide-y divide-line">' + skeletonRows(3) + "</div>").attr("aria-busy", "true");
    getMyRegistrations()
        .then(function (list) {
            registrations = list;
            render();
        })
        .catch(function (err) {
            showError($("#registration-list"), "Couldn't load your registrations. " + err.message, loadRegistrations);
        });
}

function upcomingList() {
    return registrations.filter(function (r) { return new Date(r.ends_at || r.starts_at) >= new Date(); }).sort(byStartDate);
}
function pastList() {
    return registrations.filter(function (r) { return new Date(r.ends_at || r.starts_at) < new Date(); }).sort(function (a, b) { return byStartDate(b, a); });
}

function selectTab(tab) {
    activeTab = tab;
    render();
}

function render() {
    const upcoming = upcomingList();
    const past = pastList();

    $(".tab").each(function () {
        const $tab = $(this);
        const selected = $tab.data("tab") === activeTab;
        const count = $tab.data("tab") === "upcoming" ? upcoming.length : past.length;
        $tab.attr("aria-selected", String(selected)).attr("tabindex", selected ? "0" : "-1")
            .attr("class", "tab btn " + (selected ? "bg-jacaranda text-white" : "border border-ink/20 bg-white text-ink hover:bg-canvas"))
            .text(($tab.data("tab") === "upcoming" ? "Upcoming" : "Past") + " (" + count + ")");
    });
    $("#registration-list").attr("aria-labelledby", "tab-" + activeTab);

    const list = activeTab === "upcoming" ? upcoming : past;
    const $panel = $("#registration-list").attr("aria-busy", "false");

    if (!list.length) {
        $panel.html(activeTab === "upcoming"
            ? emptyState("No registrations yet", "When you sign up for an event, it shows up here.", '<a href="events.html" class="btn-secondary">Browse events</a>')
            : emptyState("No past events", "Events you registered for show up here once they're over."));
        return;
    }

    $panel.html('<ul class="card divide-y divide-line overflow-hidden">' + list.map(function (r) {
        const upcomingRow = activeTab === "upcoming";
        return '<li class="registration-row flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" data-id="' + r.event_id + '" data-title="' + escapeHtml(r.title) + '">' +
            '<div class="flex min-w-0 flex-1 items-center gap-4">' +
                '<div class="grid size-16 shrink-0 place-items-center rounded-2xl ' + (upcomingRow ? "bg-jacaranda-mist text-jacaranda-deep" : "bg-ink/5 text-muted") + '">' +
                    '<div class="text-center leading-none"><span class="block text-2xl font-extrabold">' + escapeHtml(formatWith(r.starts_at, { day: "2-digit" })) + '</span><span class="eyebrow">' + escapeHtml(formatWith(r.starts_at, { month: "short" })) + "</span></div>" +
                "</div>" +
                '<div class="min-w-0">' +
                    '<h2 class="truncate text-lg font-bold"><a href="event.html?id=' + r.event_id + '" class="hover:text-jacaranda">' + escapeHtml(r.title) + "</a></h2>" +
                    '<p class="eyebrow mt-1 truncate text-muted">' + escapeHtml(formatWith(r.starts_at, { weekday: "short" })) + " " + escapeHtml(formatTime(r.starts_at)) + " · " + escapeHtml(r.location || "") + "</p>" +
                "</div>" +
            "</div>" +
            '<div class="flex flex-wrap items-center gap-2 sm:justify-end">' +
                (upcomingRow ? '<span class="chip bg-leaf-soft text-leaf">Registered</span>' : '<span class="chip bg-ink/5 text-muted">Ended</span>') +
                '<a href="event.html?id=' + r.event_id + '" class="btn-secondary">View</a>' +
                (upcomingRow ? '<button type="button" class="btn-danger cancel-button">Cancel<span class="sr-only"> registration for ' + escapeHtml(r.title) + "</span></button>" : "") +
            "</div>" +
        "</li>";
    }).join("") + "</ul>");
}

function cancelRegistration($button) {
    const $row = $button.closest(".registration-row");
    const title = $row.data("title");
    confirmDialog({
        title: "Cancel your spot at " + title + "?",
        message: "You can register again later if you change your mind.",
        confirmText: "Cancel registration",
        cancelText: "Keep my spot",
        danger: true,
    }).then(function (ok) {
        if (!ok) return;
        setLoading($button, true, "Cancelling…");
        apiPost("/event-registrations/cancel", { event_id: $row.data("id") })
            .then(function () {
                showToast("Registration cancelled.", "success");
                $row.fadeOut(250, function () {
                    registrations = registrations.filter(function (r) { return r.event_id !== $row.data("id"); });
                    render();
                });
            })
            .catch(function (err) {
                setLoading($button, false);
                showToast(err.message, "error");
            });
    });
}
