let announcements = [];

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    applyRoleVisibility();
    showFlash();

    const $list = $("#announcement-list");
    $list.on("click", ".play-button", function () { playFromCard($(this)); });
    $list.on("click", ".publish-button", function () { togglePublish($(this).data("id")); });
    $list.on("click", ".delete-button", function () { removeAnnouncement($(this).data("id")); });

    loadAnnouncements();
});

function loadAnnouncements() {
    $("#announcement-list").attr("aria-busy", "true").html(
        '<div class="skeleton h-56 rounded-3xl"></div><div class="mt-6 grid gap-6 md:grid-cols-2">' +
        '<div class="skeleton h-44 rounded-2xl"></div><div class="skeleton h-44 rounded-2xl"></div></div>'
    );

    apiGet("/announcements", { limit: 100 })
        .then(function (res) {
            // residents only get published clips. admins see drafts too so they can manage them
            announcements = (res.data || [])
                .filter(function (a) { return isAdmin() || isLive(a); })
                .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
            renderAnnouncements();
        })
        .catch(function (err) {
            showError($("#announcement-list"), "Couldn't load announcements. " + err.message, loadAnnouncements);
        });
}

function renderAnnouncements() {
    const $list = $("#announcement-list").attr("aria-busy", "false");
    if (!announcements.length) {
        $list.html(emptyState("No announcements yet", "Audio updates from the city will show up here.",
            isAdmin() ? '<a href="admin/announcement-form.html" class="btn-primary">' + icon("plus", "size-4") + "New announcement</a>" : ""));
        return;
    }

    const rest = announcements.slice(1);
    $list.html(
        featuredCard(announcements[0]) +
        (rest.length ? '<div class="mt-6 grid gap-6 md:grid-cols-2">' + rest.map(announcementCard).join("") + "</div>" : "")
    );
    applyRoleVisibility($list);

    $list.find("[data-audio]").each(function () {
        const $card = $(this);
        readDuration($card.data("audio"), "audio", function (d) {
            $card.data("duration", d);
            $card.find(".duration").text(formatSeconds(d));
            $card.find(".total-time").text(formatSeconds(d));
        });
    });
}

// the newest clip gets the big dark card
function featuredCard(a) {
    return (
        '<article class="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8" data-id="' + a.id + '" data-audio="' + escapeHtml(a.audio_url) + '">' +
            '<div class="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-jacaranda/30 blur-3xl" aria-hidden="true"></div>' +
            '<div class="relative">' +
                '<div class="flex flex-wrap items-center gap-3">' +
                    '<p class="eyebrow text-jacaranda-light">Latest · ' + escapeHtml(timeAgo(a.created_at)) + "</p>" +
                    (isLive(a) ? "" : '<span data-role="admin">' + statusChip(a) + "</span>") +
                "</div>" +
                '<h2 class="mt-3 text-2xl font-bold text-balance sm:text-3xl">' + escapeHtml(a.title) + "</h2>" +
                '<div class="mt-6 flex items-center gap-4 sm:gap-6">' +
                    '<button type="button" class="play-button grid size-16 shrink-0 place-items-center rounded-full bg-jacaranda text-white shadow-lg shadow-jacaranda/30 hover:bg-jacaranda-light sm:size-20" data-title="' + escapeHtml(a.title) + '" aria-label="Play ' + escapeHtml(a.title) + '">' + icon("play", "*:fill-current size-7 translate-x-px") + "</button>" +
                    '<div class="wave flex h-14 min-w-0 flex-1 items-center justify-between gap-[3px] overflow-hidden" aria-hidden="true">' + waveform(a.title, 70, "bg-white/25") + "</div>" +
                    '<p class="shrink-0 text-lg font-bold tabular-nums"><span class="current-time">0:00</span> / <span class="total-time">–:––</span></p>' +
                "</div>" +
                '<div class="mt-6 flex flex-wrap items-center justify-between gap-3">' +
                    '<a href="announcement.html?id=' + a.id + '" class="inline-flex items-center gap-1 font-semibold text-jacaranda-light underline underline-offset-4 hover:text-white">Open clip' + icon("arrow-right", "size-4") + "</a>" +
                    adminActions(a, true) +
                "</div>" +
            "</div>" +
        "</article>"
    );
}

function announcementCard(a) {
    return (
        '<article class="card min-w-0 p-5" data-id="' + a.id + '" data-audio="' + escapeHtml(a.audio_url) + '">' +
            '<div class="flex items-start justify-between gap-3">' +
                '<h2 class="text-lg font-bold"><a href="announcement.html?id=' + a.id + '" class="hover:text-jacaranda">' + escapeHtml(a.title) + "</a></h2>" +
                '<p class="eyebrow shrink-0 pt-1.5 text-muted">' + escapeHtml(timeAgo(a.created_at)) + "</p>" +
            "</div>" +
            (isLive(a) ? "" : '<div data-role="admin" class="mt-2">' + statusChip(a) + "</div>") +
            '<div class="mt-4 flex items-center gap-4 rounded-full bg-jacaranda-mist p-2 pr-5">' +
                '<button type="button" class="play-button grid size-12 shrink-0 place-items-center rounded-full bg-jacaranda text-white hover:bg-jacaranda-deep" data-title="' + escapeHtml(a.title) + '" aria-label="Play ' + escapeHtml(a.title) + '">' + icon("play", "*:fill-current size-5 translate-x-px") + "</button>" +
                '<div class="wave flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden="true">' + waveform(a.title, 40, "bg-jacaranda/40") + "</div>" +
                '<span class="duration shrink-0 text-sm font-bold text-jacaranda-deep tabular-nums">–:––</span>' +
            "</div>" +
            '<div class="mt-4 flex flex-wrap items-center justify-between gap-3">' +
                '<a href="announcement.html?id=' + a.id + '" class="inline-flex items-center gap-1 text-sm font-semibold text-jacaranda-deep underline underline-offset-4 hover:text-jacaranda">Open clip' + icon("arrow-right", "size-4") + "</a>" +
                adminActions(a, false) +
            "</div>" +
        "</article>"
    );
}

// admin only: edit / publish toggle / delete on each clip. residents never get these
function adminActions(a, dark) {
    const btn = dark ? "btn min-h-9 px-3 text-white hover:bg-white/10" : "btn-ghost min-h-9 px-3";
    return (
        '<div data-role="admin" class="flex flex-wrap items-center gap-1">' +
            '<a href="admin/announcement-form.html?id=' + a.id + '" class="' + btn + '">' + icon("pencil", "size-4") + "Edit</a>" +
            '<button type="button" class="publish-button ' + btn + '" data-id="' + a.id + '">' + icon(isLive(a) ? "eye-off" : "eye", "size-4") + (isLive(a) ? "Unpublish" : "Publish") + "</button>" +
            '<button type="button" class="delete-button ' + btn + (dark ? " hover:text-[#FFB4AB]" : " text-danger hover:bg-blush/60") + '" data-id="' + a.id + '">' + icon("trash-2", "size-4") + "Delete</button>" +
        "</div>"
    );
}

function playFromCard($button) {
    const $card = $button.closest("[data-audio]");
    const featured = $card.hasClass("bg-ink");
    toggleClip($button, $card.data("audio"), function (time, duration) {
        if (featured) {
            paintWaveform($card.find(".wave"), time / duration, "bg-jacaranda-light", "bg-white/25");
            $card.find(".current-time").text(formatSeconds(time));
        } else {
            paintWaveform($card.find(".wave"), time / duration, "bg-jacaranda", "bg-jacaranda/40");
        }
    });
}

function findAnnouncement(id) {
    return announcements.find(function (a) { return a.id === id; });
}

// admin only (button is only rendered for admins)
function togglePublish(id) {
    const a = findAnnouncement(id);
    if (sharedAudio) sharedAudio.pause(); // the cards get redrawn
    setPublishState("announcements", a, !isLive(a), renderAnnouncements);
}

// admin only
function removeAnnouncement(id) {
    deleteMedia("announcements", findAnnouncement(id)).then(function (deleted) {
        if (!deleted) return;
        if (sharedAudio) sharedAudio.pause();
        announcements = announcements.filter(function (a) { return a.id !== id; });
        renderAnnouncements();
    });
}
