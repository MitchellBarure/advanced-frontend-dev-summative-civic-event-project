$(function () {
    // admin only page (GET /api/dashboard/admin is admin only on the backend too)
    if (!requireAdmin()) return;
    renderAdminSidebar("dashboard");
    fillIcons();
    showFlash();
    $("#dashboard-date").text(formatLongDate(new Date()));
    $("#refresh").on("click", loadDashboard);
    loadDashboard();
});

function loadDashboard() {
    showLoading();
    Promise.all([
        apiGet("/dashboard/admin"),
        loadAllRegistrations(),
        apiGet("/announcements", { limit: 100 }),
        apiGet("/promos", { limit: 100 }),
        loadNotifications(),
    ])
        .then(function (results) {
            const data = {
                stats: results[0].data,
                events: results[1].events,
                registrations: results[1].registrations,
                announcements: results[2].data || [],
                promos: results[3].data || [],
                notifications: results[4],
            };
            renderStats(data);
            renderChart(data.registrations);
            renderTopEvents(data.events, data.registrations);
            renderContentStatus(data);
        })
        .catch(function (err) {
            showError($("#stats"), "Couldn't load the dashboard. " + err.message, loadDashboard);
            $("#chart, #chart-labels, #top-events, #content-status").empty();
        });
}

function showLoading() {
    let cards = "";
    for (let i = 0; i < 5; i++) cards += '<div class="card p-5"><div class="skeleton h-4 w-24"></div><div class="skeleton mt-4 h-10 w-16"></div><div class="skeleton mt-3 h-4 w-20"></div></div>';
    $("#stats").html(cards).attr("aria-busy", "true");
    $("#chart").html('<div class="skeleton h-full w-full"></div>');
    $("#chart-labels").empty();
    $("#top-events").html('<li class="skeleton h-10"></li><li class="skeleton h-10"></li><li class="skeleton h-10"></li>');
    $("#content-status").html('<div class="skeleton h-24"></div><div class="skeleton h-24"></div>');
}

function countPublished(list) {
    return list.filter(function (item) { return item.published !== false; }).length;
}

function statCard(label, value, note, iconName, href) {
    return '<a href="' + href + '" class="card block p-5 transition hover:-translate-y-0.5 hover:shadow-lg">' +
        '<div class="flex items-start justify-between gap-2"><p class="eyebrow text-muted">' + escapeHtml(label) + "</p>" +
        '<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-jacaranda-mist text-jacaranda">' + icon(iconName, "size-5") + "</span></div>" +
        '<p class="mt-2 text-4xl font-extrabold tabular-nums">' + Number(value || 0).toLocaleString("en-ZA") + "</p>" +
        '<p class="mt-1 text-sm text-muted">' + escapeHtml(note) + "</p></a>";
}

function renderStats(d) {
    const unread = d.notifications.filter(function (n) { return !isRead(n); }).length;
    $("#stats").attr("aria-busy", "false").html(
        statCard("Events", d.events.length, countPublished(d.events) + " published", "calendar-days", "events.html") +
        statCard("Promos", d.promos.length, countPublished(d.promos) + " published", "clapperboard", "../promos.html") +
        statCard("Users", d.stats.users.total_users, d.stats.users.active_users + " active", "users", "users.html") +
        statCard("Registrations", d.registrations.length, "active, all time", "ticket", "events.html") +
        statCard("Notifications", d.notifications.length, unread + " unread by you", "bell", "notifications.html")
    );
}

// "2026-11-23" in SA time, so a registration at 01:00 SA time lands on the right day
function dayKey(date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: SA_TIMEZONE }).format(date);
}

function renderChart(registrations) {
    const perDay = {};
    registrations.forEach(function (r) {
        const key = dayKey(new Date(r.created_at));
        perDay[key] = (perDay[key] || 0) + 1;
    });

    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        days.push({ date: date, count: perDay[dayKey(date)] || 0 });
    }
    const max = Math.max.apply(null, days.map(function (d) { return d.count; }).concat([1]));

    $("#chart").html(days.map(function (d) {
        const label = formatWith(d.date, { day: "numeric", month: "short" }) + ": " + d.count;
        const height = d.count ? Math.max(6, (d.count / max) * 100) : 2;
        return '<div class="flex h-full flex-1 items-end" title="' + escapeHtml(label) + '">' +
            '<div class="w-full rounded-t-md ' + (d.count ? "bg-jacaranda" : "bg-line") + '" style="height:' + height + '%"></div></div>';
    }).join(""));

    // a label every week: 30 days ago, then each 7 days, then today
    const labels = [0, 7, 14, 21, 29].map(function (i) { return formatWith(days[i].date, { day: "numeric", month: "short" }); });
    $("#chart-labels").html(labels.map(function (l) { return "<span>" + escapeHtml(l) + "</span>"; }).join(""));

    // the bars are hidden from screen readers, so this sentence says the same thing
    const total = days.reduce(function (sum, d) { return sum + d.count; }, 0);
    const busiest = days.reduce(function (best, d) { return d.count > best.count ? d : best; }, days[0]);
    $("#chart-summary").text(total + (total === 1 ? " registration" : " registrations") + " in the last 30 days." +
        (total ? " Busiest day: " + formatWith(busiest.date, { day: "numeric", month: "long" }) + " with " + busiest.count + "." : ""));

    // this month vs last month, by SA calendar month
    const thisMonth = dayKey(new Date()).slice(0, 7);
    const lastDate = new Date();
    lastDate.setDate(1);
    lastDate.setMonth(lastDate.getMonth() - 1);
    const lastMonth = dayKey(lastDate).slice(0, 7);
    const inMonth = function (m) { return registrations.filter(function (r) { return dayKey(new Date(r.created_at)).slice(0, 7) === m; }).length; };
    $("#this-month").text(inMonth(thisMonth));
    $("#last-month").text(inMonth(lastMonth));
}

function renderTopEvents(events, registrations) {
    const counts = events.map(function (e) {
        return { event: e, count: registrations.filter(function (r) { return r.event_id === e.id; }).length };
    }).filter(function (row) { return row.count > 0; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 5);

    if (!counts.length) {
        $("#top-events").html('<li class="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">No registrations yet. They\'ll be ranked here.</li>');
        return;
    }
    const max = counts[0].count;
    $("#top-events").html(counts.map(function (row) {
        return "<li>" +
            '<div class="flex items-baseline justify-between gap-3">' +
                '<a href="../event.html?id=' + row.event.id + '" class="truncate hover:text-jacaranda">' + escapeHtml(row.event.title) + "</a>" +
                '<span class="font-bold tabular-nums">' + row.count + '<span class="sr-only">' + (row.count === 1 ? " registration" : " registrations") + "</span></span>" +
            "</div>" +
            '<div class="mt-2 h-2.5 overflow-hidden rounded-full bg-jacaranda-mist" aria-hidden="true">' +
                '<div class="h-full rounded-full bg-jacaranda-deep" style="width:' + (row.count / max) * 100 + '%"></div></div>' +
        "</li>";
    }).join(""));
}

function statusTile(label, value, note, wide) {
    return '<div class="rounded-2xl border border-line p-4' + (wide ? " sm:col-span-2" : "") + '">' +
        '<p class="eyebrow text-muted">' + escapeHtml(label) + "</p>" +
        '<p class="mt-1 text-3xl font-extrabold tabular-nums">' + value + "</p>" +
        (note ? '<p class="mt-0.5 text-sm text-muted">' + escapeHtml(note) + "</p>" : "") + "</div>";
}

function renderContentStatus(d) {
    const all = d.events.concat(d.announcements, d.promos);
    const published = countPublished(all);
    // service requests live in this browser (localStorage), see service-requests.js
    const open = allRequests().filter(function (r) { return r.status !== "resolved"; }).length;
    $("#content-status").html(
        statusTile("Published", published, "") +
        statusTile("Drafts", all.length - published, "") +
        statusTile("Open service requests", open, "Submitted or in progress", true)
    );
}
