$(function () {
    // admin only page (GET /api/dashboard/admin is admin only on the backend too)
    if (!requireAdmin()) return;
    renderAdminSidebar("dashboard");
    fillIcons();
    showFlash();
    $("#dashboard-date").text(formatLongDate(new Date()));
    loadStats();
});

function statCard(label, value, iconName, href) {
    return '<a href="' + href + '" class="card block p-5 transition hover:-translate-y-0.5 hover:shadow-lg">' +
        '<div class="flex items-center justify-between"><p class="text-sm font-semibold text-muted">' + escapeHtml(label) + "</p>" +
        '<span class="grid size-10 place-items-center rounded-xl bg-jacaranda-mist text-jacaranda">' + icon(iconName, "size-5") + "</span></div>" +
        '<p class="mt-3 text-4xl font-extrabold tabular-nums">' + escapeHtml(value == null ? 0 : value) + "</p></a>";
}

function loadStats() {
    let skeleton = "";
    for (let i = 0; i < 5; i++) skeleton += '<div class="card p-5"><div class="skeleton h-4 w-24"></div><div class="skeleton mt-4 h-10 w-16"></div></div>';
    $("#stats").html(skeleton).attr("aria-busy", "true");

    apiGet("/dashboard/admin")
        .then(function (res) {
            const d = res.data;
            $("#stats").attr("aria-busy", "false").html(
                statCard("Total events", d.events.total_events, "calendar-days", "events.html") +
                statCard("Total promos", d.promos.total_promos, "clapperboard", "../promos.html") +
                statCard("Users", d.users.total_users, "users", "users.html") +
                statCard("Registrations", d.registrations.total_registrations, "ticket", "events.html") +
                statCard("Announcements", d.announcements.total_announcements, "megaphone", "../announcements.html")
            );
        })
        .catch(function (err) {
            showError($("#stats"), "Couldn't load the numbers. " + err.message, loadStats);
        });
}
