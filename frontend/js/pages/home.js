$(function () {
    // any logged-in user. admins can open this too through "View public site"
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    showFlash();

    const user = getUser();
    $("#today").text(formatLongDate(new Date()));
    $("#greeting").text("Dumela, " + firstName(user.full_name));

    loadHome();
    bindRegisterButtons($("#upcoming-events"), function () { loadRegistrations(); });
});

function loadHome() {
    loadEventsAndRegistrations();
    loadAnnouncements();
}

function loadEventsAndRegistrations() {
    $("#upcoming-events").html(skeletonCards(3)).attr("aria-busy", "true");
    $("#my-registrations").html(skeletonRows(3)).attr("aria-busy", "true");

    Promise.all([apiGet("/events"), getMyRegistrations()])
        .then(function (results) {
            const events = results[0].data || [];
            const registrations = results[1];
            renderUpcoming(events, registrations);
            renderRegistrations(registrations);
        })
        .catch(function (err) {
            showError($("#upcoming-events"), "Couldn't load events. " + err.message, loadEventsAndRegistrations);
            $("#my-registrations").attr("aria-busy", "false").empty();
        });
}

function loadRegistrations() {
    getMyRegistrations().then(renderRegistrations).catch(function () {});
}

function renderUpcoming(events, registrations) {
    const registeredIds = registrations.map(function (r) { return r.event_id; });
    const upcoming = events
        .filter(function (e) { return isPublished(e) && !isPast(e); })
        .sort(byStartDate)
        .slice(0, 3);

    const $list = $("#upcoming-events").attr("aria-busy", "false");
    if (!upcoming.length) {
        $list.html(emptyState("Nothing on just yet", "New events show up here as soon as the city publishes them."));
        return;
    }
    $list.html(upcoming.map(function (e) {
        return eventCard(e, { compact: true, registered: registeredIds.indexOf(e.id) !== -1 });
    }).join(""));
    applyRoleVisibility($list);
}

function renderRegistrations(registrations) {
    const upcoming = registrations.filter(function (r) { return new Date(r.ends_at || r.starts_at) >= new Date(); }).sort(byStartDate);
    const thisWeek = upcoming.filter(function (r) { return daysUntil(r.starts_at) <= 7; }).length;

    $("#week-summary").text(thisWeek
        ? "You have " + thisWeek + " event" + (thisWeek === 1 ? "" : "s") + " coming up this week."
        : "Nothing booked this week. Have a look at what's on in Pretoria.");

    const $list = $("#my-registrations").attr("aria-busy", "false");
    if (!upcoming.length) {
        $list.html(
            '<div class="card p-6 text-center"><p class="font-semibold">No registrations yet</p>' +
            '<p class="mt-1 text-sm text-muted">Events you sign up for will show up here.</p>' +
            '<a href="events.html" class="btn-secondary mt-4">Browse events</a></div>'
        );
        return;
    }

    $list.html(upcoming.slice(0, 3).map(function (r, i) {
        const days = daysUntil(r.starts_at);
        const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days";
        const next = i === 0;
        return '<a href="event.html?id=' + r.event_id + '" class="card block p-5 transition hover:shadow-lg ' + (next ? "border-jacaranda ring-1 ring-jacaranda" : "") + '">' +
            (next ? '<span class="chip mb-3 bg-jacaranda-mist text-jacaranda-deep">Next up · ' + when + "</span>" : "") +
            '<p class="font-bold">' + escapeHtml(r.title) + "</p>" +
            '<p class="eyebrow mt-1 text-muted">' + escapeHtml(formatDay(r.starts_at)) + " · " + escapeHtml(formatTime(r.starts_at)) + " · " + escapeHtml(r.location || "") + "</p>" +
        "</a>";
    }).join(""));
}

function loadAnnouncements() {
    $("#latest-announcements").html(skeletonRows(2)).attr("aria-busy", "true");
    apiGet("/announcements")
        .then(function (res) {
            const list = (res.data || [])
                .filter(function (a) { return a.published !== false; })
                .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
                .slice(0, 2);
            renderAnnouncements(list);
        })
        .catch(function (err) {
            showError($("#latest-announcements"), "Couldn't load announcements. " + err.message, loadAnnouncements);
        });
}

function renderAnnouncements(list) {
    const $list = $("#latest-announcements").attr("aria-busy", "false");
    if (!list.length) {
        $list.html(emptyState("No announcements yet", "Audio updates from the city will show up here."));
        return;
    }
    $list.html(list.map(function (a) {
        return '<article class="card flex items-center gap-4 p-4" data-audio="' + escapeHtml(a.audio_url) + '">' +
            '<button type="button" class="play-button grid size-12 shrink-0 place-items-center rounded-full bg-jacaranda text-white hover:bg-jacaranda-deep" data-title="' + escapeHtml(a.title) + '" aria-label="Play ' + escapeHtml(a.title) + '">' + icon("play", "*:fill-current size-5 translate-x-px") + "</button>" +
            '<div class="min-w-0 flex-1">' +
                '<h3 class="truncate font-bold"><a href="announcement.html?id=' + a.id + '" class="hover:text-jacaranda">' + escapeHtml(a.title) + "</a></h3>" +
                '<div class="wave mt-2 flex h-6 items-center gap-[3px] overflow-hidden" aria-hidden="true">' + waveform(a.title, 36, "bg-jacaranda/35") + "</div>" +
            "</div>" +
            '<span class="duration w-10 text-right text-sm font-semibold text-muted tabular-nums">–:––</span>' +
        "</article>";
    }).join(""));

    $list.find("[data-audio]").each(function () {
        const $row = $(this);
        readDuration($row.data("audio"), "audio", function (d) { $row.find(".duration").text(formatSeconds(d)); });
    });

    $list.find(".play-button").on("click", function () {
        const $row = $(this).closest("[data-audio]");
        toggleClip($(this), $row.data("audio"), function (time, duration) {
            paintWaveform($row.find(".wave"), time / duration, "bg-jacaranda", "bg-jacaranda/35");
        });
    });
}
