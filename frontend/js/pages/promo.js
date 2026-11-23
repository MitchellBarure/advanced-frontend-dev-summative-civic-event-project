const promoId = new URLSearchParams(location.search).get("id");
let promo = null;
let captionsOn = true; // captions start on, the brief wants that

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    applyRoleVisibility();
    showFlash();

    if (!promoId) {
        showNotFound();
        return;
    }
    bindPlayer();
    loadPromo();
});

function loadPromo() {
    $("#promo-loading").prop("hidden", false);
    $("#promo-error").prop("hidden", true);

    apiGet("/promos/" + promoId)
        .then(function (res) {
            promo = res.data;
            // residents can't open drafts, even with the link. admins can
            if (!isLive(promo) && !isAdmin()) {
                showNotFound();
                return;
            }
            renderPromo();
            loadMorePromos();
        })
        .catch(function (err) {
            $("#promo-loading").prop("hidden", true);
            if (err.status === 404) { showNotFound(); return; }
            showError($("#promo-error").prop("hidden", false), "Couldn't load this promo. " + err.message, loadPromo);
        });
}

function showNotFound() {
    $("#promo-loading").prop("hidden", true);
    $("#crumb-title").text("Not found");
    $("#promo-error").prop("hidden", false).html(emptyState(
        "We couldn't find that promo",
        "It may have been removed or isn't published yet.",
        '<a href="promos.html" class="btn-primary">All promos</a>'
    ));
}

function renderPromo() {
    const p = promo;
    document.title = p.title + " · Jacaranda City";
    $("#crumb-title").text(p.title);
    $("#title").text(p.title);
    $("#meta").text("Published " + formatWith(p.created_at, { day: "numeric", month: "short", year: "numeric" }));
    $("#description").text(p.description || "");
    const transcript = captionsToTranscript(p.caption_text);
    $("#transcript").text(transcript || "No transcript for this one yet.");
    $("#fallback-link, #download-link").attr("href", p.video_url);
    $("#video").attr("src", p.video_url);
    if (!p.caption_text) $("#captions").prop("hidden", true);
    renderAdminActions();
    applyRoleVisibility();

    $("#promo-loading").prop("hidden", true);
    $("#promo").prop("hidden", false);
}

// admin only: edit / publish toggle / delete. residents get these removed by applyRoleVisibility
function renderAdminActions() {
    const live = isLive(promo);
    $("#admin-actions").html(
        (live ? "" : statusChip(promo)) +
        '<a href="admin/promo-form.html?id=' + promo.id + '" class="btn-secondary">' + icon("pencil", "size-4") + "Edit</a>" +
        '<button type="button" id="publish-toggle" class="btn-secondary">' + icon(live ? "eye-off" : "eye", "size-4") + (live ? "Unpublish" : "Publish") + "</button>" +
        '<button type="button" id="delete-promo" class="btn-danger">' + icon("trash-2", "size-4") + "Delete</button>"
    );
    $("#publish-toggle").on("click", function () {
        setPublishState("promos", promo, !isLive(promo))
            .then(function (updated) {
                Object.assign(promo, updated);
                renderAdminActions();
            })
            .catch(function (err) { showToast(err.message, "error"); });
    });
    $("#delete-promo").on("click", function () {
        deleteMedia("promos", promo).then(function (deleted) {
            if (!deleted) return;
            flash("Promo deleted.", "success");
            window.location.href = "promos.html";
        });
    });
}

function loadMorePromos() {
    $("#more-promos").html(skeletonCards(3));
    apiGet("/promos", { limit: 100 })
        .then(function (res) {
            const others = (res.data || [])
                .filter(function (p) { return p.id !== promo.id && isLive(p); })
                .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
                .slice(0, 3);
            if (!others.length) {
                $("#more-promos").closest("section").prop("hidden", true);
                return;
            }
            $("#more-promos").html(others.map(function (p) {
                return '<a href="promo.html?id=' + p.id + '" class="card group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">' +
                    videoThumb(p, false) +
                    '<p class="p-4 font-bold group-hover:text-jacaranda">' + escapeHtml(p.title) + "</p></a>";
            }).join(""));
            fillVideoDurations($("#more-promos"));
        })
        .catch(function () { $("#more-promos").closest("section").prop("hidden", true); });
}

/* the player: a <video> with my own controls bar under it */
function bindPlayer() {
    const video = $("#video")[0];

    $("#play").on("click", function () { togglePlayback(video); });
    $(video).on("click", function () { togglePlayback(video); });

    $("#mute").on("click", function () {
        video.muted = !video.muted;
        if (!video.muted && video.volume === 0) video.volume = 1;
        updateVolumeButton(video);
    });
    $("#volume").on("input", function () {
        video.volume = Number(this.value);
        video.muted = video.volume === 0;
        updateVolumeButton(video);
    });
    $("#seek").on("input", function () {
        if (isFinite(video.duration)) video.currentTime = (this.value / 100) * video.duration;
    });
    $("#captions").on("click", function () { setCaptions(!captionsOn); });
    $("#fullscreen").on("click", toggleFullscreen);
    $(document).on("fullscreenchange", function () {
        const full = !!document.fullscreenElement;
        $("#fullscreen").html(icon(full ? "minimize" : "maximize", "size-5")).attr("aria-label", full ? "Exit full screen" : "Full screen");
    });

    $(video).on("loadedmetadata", function () {
        $("#total-time").text(formatSeconds(video.duration));
        $("#meta").text($("#meta").text() + " · " + longDuration(video.duration));
        addCaptionTrack(video);
    });
    $(video).on("timeupdate", function () { updateProgress(video); });
    $(video).on("volumechange", function () { updateVolumeButton(video); });
    $(video).on("play", function () { setPlayButton(true); });
    $(video).on("pause ended", function () { setPlayButton(false); });
    $(video).on("error", function () { $("#video-problem").prop("hidden", false); });

    // keyboard shortcuts, but not while typing or on a slider/button
    $(document).on("keydown", function (e) {
        if ($(e.target).is("input, textarea, select, button, a, summary")) return;
        if ($("#promo").prop("hidden")) return;
        const key = e.key.toLowerCase();
        if (key === " ") { e.preventDefault(); togglePlayback(video); }
        else if (key === "arrowleft") { e.preventDefault(); skip(video, -10); }
        else if (key === "arrowright") { e.preventDefault(); skip(video, 10); }
        else if (key === "c" && promo && promo.caption_text) setCaptions(!captionsOn);
        else if (key === "f") toggleFullscreen();
    });
}

// the caption text becomes a WebVTT file in memory, timed to the video length
function addCaptionTrack(video) {
    if (!promo || !promo.caption_text || video.querySelector("track")) return;
    const vtt = captionsToVtt(promo.caption_text, video.duration);
    if (!vtt) return;

    const track = document.createElement("track");
    track.kind = "captions";
    track.label = "English";
    track.srclang = "en";
    track.default = true;
    track.src = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
    video.appendChild(track);
    track.addEventListener("load", function () { setCaptions(captionsOn); });
    setCaptions(captionsOn);
}

function setCaptions(on) {
    captionsOn = on;
    const video = $("#video")[0];
    if (video.textTracks.length) video.textTracks[0].mode = on ? "showing" : "hidden";
    $("#captions").attr("aria-pressed", String(on))
        .toggleClass("bg-jacaranda hover:bg-jacaranda-light", on)
        .toggleClass("bg-white/10 hover:bg-white/20", !on);
    $("#captions .cc-label").text(on ? "CC on" : "CC off");
}

function togglePlayback(video) {
    if (video.paused) {
        video.play().catch(function () { $("#video-problem").prop("hidden", false); });
    } else {
        video.pause();
    }
}

function skip(video, seconds) {
    if (!isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);
}

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else $("#player")[0].requestFullscreen().catch(function () {});
}

function setPlayButton(playing) {
    $("#play").html(playing ? icon("pause", "size-5") : icon("play", "*:fill-current size-5 translate-x-px")).attr("aria-label", playing ? "Pause" : "Play");
}

function updateProgress(video) {
    const fraction = isFinite(video.duration) && video.duration ? video.currentTime / video.duration : 0;
    $("#current-time").text(formatSeconds(video.currentTime));
    $("#seek").val(fraction * 100).attr("aria-valuetext", formatSeconds(video.currentTime) + " of " + formatSeconds(video.duration));
}

function updateVolumeButton(video) {
    const muted = video.muted || video.volume === 0;
    $("#mute").html(icon(muted ? "volume-x" : "volume-2", "size-5"))
        .attr("aria-label", muted ? "Unmute" : "Mute").attr("aria-pressed", String(muted));
    $("#volume").val(muted ? 0 : video.volume);
}
