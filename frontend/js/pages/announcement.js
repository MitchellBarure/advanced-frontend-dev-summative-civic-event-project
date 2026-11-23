const announcementId = new URLSearchParams(location.search).get("id");
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
let announcement = null;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    applyRoleVisibility();
    showFlash();

    if (!announcementId) {
        showNotFound();
        return;
    }
    bindPlayer();
    loadAnnouncement();
});

function loadAnnouncement() {
    $("#announcement-loading").prop("hidden", false);
    $("#announcement-error").prop("hidden", true);

    apiGet("/announcements/" + announcementId)
        .then(function (res) {
            announcement = res.data;
            // residents can't open drafts, even with the link. admins can
            if (!isLive(announcement) && !isAdmin()) {
                showNotFound();
                return;
            }
            renderAnnouncement();
        })
        .catch(function (err) {
            $("#announcement-loading").prop("hidden", true);
            if (err.status === 404) { showNotFound(); return; }
            showError($("#announcement-error").prop("hidden", false), "Couldn't load this announcement. " + err.message, loadAnnouncement);
        });
}

function showNotFound() {
    $("#announcement-loading").prop("hidden", true);
    $("#crumb-title").text("Not found");
    $("#announcement-error").prop("hidden", false).html(emptyState(
        "We couldn't find that announcement",
        "It may have been removed or isn't published yet.",
        '<a href="announcements.html" class="btn-primary">All announcements</a>'
    ));
}

function renderAnnouncement() {
    const a = announcement;
    document.title = a.title + " · Jacaranda City";
    $("#crumb-title").text(a.title);
    $("#title").text(a.title);
    $("#meta").text("Posted " + formatWith(a.created_at, { day: "numeric", month: "short", year: "numeric" }));
    $("#wave").html(waveform(a.title, 70, "bg-white/25"));
    $("#fallback-link, #download-link").attr("href", a.audio_url);
    $("#audio").attr("src", a.audio_url);
    renderAdminActions();
    applyRoleVisibility();

    $("#announcement-loading").prop("hidden", true);
    $("#announcement").prop("hidden", false);
}

// admin only: edit / publish toggle / delete. residents get these removed by applyRoleVisibility
function renderAdminActions() {
    const live = isLive(announcement);
    $("#admin-actions").html(
        (live ? "" : statusChip(announcement)) +
        '<a href="admin/announcement-form.html?id=' + announcement.id + '" class="btn-secondary">' + icon("pencil", "size-4") + "Edit</a>" +
        '<button type="button" id="publish-toggle" class="btn-secondary">' + icon(live ? "eye-off" : "eye", "size-4") + (live ? "Unpublish" : "Publish") + "</button>" +
        '<button type="button" id="delete-announcement" class="btn-danger">' + icon("trash-2", "size-4") + "Delete</button>"
    );
    $("#publish-toggle").on("click", function () {
        setPublishState("announcements", announcement, !isLive(announcement))
            .then(function (updated) {
                Object.assign(announcement, updated);
                renderAdminActions();
            })
            .catch(function (err) { showToast(err.message, "error"); });
    });
    $("#delete-announcement").on("click", function () {
        deleteMedia("announcements", announcement).then(function (deleted) {
            if (!deleted) return;
            flash("Announcement deleted.", "success");
            window.location.href = "announcements.html";
        });
    });
}

/* the player: a hidden <audio> with my own buttons on top */
function bindPlayer() {
    const audio = $("#audio")[0];

    $("#play").on("click", function () { togglePlayback(audio); });
    $("#back-10").on("click", function () { skip(audio, -10); });
    $("#forward-10").on("click", function () { skip(audio, 10); });

    $("#speed").on("click", function () {
        const next = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length];
        audio.playbackRate = next;
        $(this).text(next + "x").attr("aria-label", "Playback speed " + next + "x");
    });

    $("#mute").on("click", function () {
        audio.muted = !audio.muted;
        if (!audio.muted && audio.volume === 0) audio.volume = 1;
        updateVolumeButton(audio);
    });
    $("#volume").on("input", function () {
        audio.volume = Number(this.value);
        audio.muted = audio.volume === 0;
        updateVolumeButton(audio);
    });

    $("#seek").on("input", function () {
        if (isFinite(audio.duration)) audio.currentTime = (this.value / 100) * audio.duration;
    });

    $(audio).on("loadedmetadata", function () {
        $("#total-time").text(formatSeconds(audio.duration));
        $("#meta").text($("#meta").text() + " · " + longDuration(audio.duration));
    });
    $(audio).on("timeupdate", function () { updateProgress(audio); });
    $(audio).on("volumechange", function () { updateVolumeButton(audio); });
    $(audio).on("play", function () { setMainButton(true); });
    $(audio).on("pause ended", function () { setMainButton(false); });
    $(audio).on("error", function () { $("#audio-problem").prop("hidden", false); });

    // keyboard: space plays/pauses, arrows skip. not while typing or on a slider (they use arrows)
    $(document).on("keydown", function (e) {
        if ($(e.target).is("input, textarea, select, button, a")) return;
        if ($("#announcement").prop("hidden")) return;
        if (e.key === " ") { e.preventDefault(); togglePlayback(audio); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); skip(audio, -10); }
        else if (e.key === "ArrowRight") { e.preventDefault(); skip(audio, 10); }
    });
}

function togglePlayback(audio) {
    if (audio.paused) {
        audio.play().catch(function () { $("#audio-problem").prop("hidden", false); });
    } else {
        audio.pause();
    }
}

function skip(audio, seconds) {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
}

function setMainButton(playing) {
    $("#play").html(playing ? icon("pause", "size-7") : icon("play", "*:fill-current size-7 translate-x-px")).attr("aria-label", playing ? "Pause" : "Play");
}

function updateProgress(audio) {
    const fraction = isFinite(audio.duration) && audio.duration ? audio.currentTime / audio.duration : 0;
    $("#current-time").text(formatSeconds(audio.currentTime));
    $("#seek").val(fraction * 100).attr("aria-valuetext", formatSeconds(audio.currentTime) + " of " + formatSeconds(audio.duration));
    paintWaveform($("#wave"), fraction, "bg-jacaranda-light", "bg-white/25");
}

function updateVolumeButton(audio) {
    const muted = audio.muted || audio.volume === 0;
    $("#mute").html(icon(muted ? "volume-x" : "volume-2", "size-5"))
        .attr("aria-label", muted ? "Unmute" : "Mute").attr("aria-pressed", String(muted));
    $("#volume").val(muted ? 0 : audio.volume);
}
