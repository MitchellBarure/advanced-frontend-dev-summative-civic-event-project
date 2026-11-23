// Audio + video bits shared by home, announcements and promos.

function formatSeconds(total) {
    if (!isFinite(total)) return "–:––";
    const s = Math.round(total);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// "2 min 14 s" for the detail page
function longDuration(total) {
    if (!isFinite(total)) return "";
    const s = Math.round(total);
    const m = Math.floor(s / 60);
    return (m ? m + " min " : "") + (s % 60) + " s";
}

function timeAgo(iso) {
    const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
    const days = daysUntil(iso) * -1;
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    return formatWith(iso, { day: "numeric", month: "short" });
}

// fake waveform bars. the same title always gets the same shape, and it's only decoration
function waveform(seed, count, barClass) {
    let n = 0;
    for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
    let bars = "";
    for (let i = 0; i < count; i++) {
        const height = 25 + ((n * (i + 3) * 7) % 70);
        bars += '<span class="wave-bar w-1 shrink-0 rounded-full ' + barClass + '" style="height:' + height + '%"></span>';
    }
    return bars;
}

// colour the bars up to the current position, like a progress bar
function paintWaveform($wave, fraction, playedClass, restClass) {
    const $bars = $wave.find(".wave-bar");
    const played = Math.round($bars.length * fraction);
    $bars.each(function (i) {
        $(this).toggleClass(playedClass, i < played).toggleClass(restClass, i >= played);
    });
}

// the backend doesn't store durations, so read them from the file itself
function readDuration(url, kind, done) {
    const media = document.createElement(kind || "audio");
    media.preload = "metadata";
    media.addEventListener("loadedmetadata", function () { done(media.duration); });
    media.src = url;
}

function isLive(item) {
    return item.published !== false;
}

function statusChip(item) {
    return isLive(item)
        ? '<span class="chip bg-leaf-soft text-leaf">' + icon("circle-check", "size-3.5") + "Published</span>"
        : '<span class="chip bg-sandstone-soft text-ink">' + icon("eye-off", "size-3.5") + "Draft</span>";
}

/* one audio element for the whole page, so only one clip plays at a time */
let sharedAudio = null;
let sharedAudioButton = null;

function setPlayButton($button, playing) {
    const title = $button.data("title");
    const size = $button.hasClass("size-12") ? "size-5" : "size-7";
    $button.html(playing ? icon("pause", size) : icon("play", "*:fill-current " + size + " translate-x-px"))
        .attr("aria-label", (playing ? "Pause " : "Play ") + title);
}

// play/pause a clip from a card. onTime gets (currentTime, duration) while it plays
function toggleClip($button, url, onTime) {
    if (sharedAudio && sharedAudioButton && sharedAudioButton[0] === $button[0]) {
        if (sharedAudio.paused) sharedAudio.play();
        else sharedAudio.pause();
        return;
    }
    if (sharedAudio) {
        sharedAudio.pause();
        $(sharedAudio).off();
        if (sharedAudioButton) setPlayButton(sharedAudioButton, false);
    }

    sharedAudio = new Audio(url);
    sharedAudioButton = $button;
    $(sharedAudio).on("play", function () { setPlayButton($button, true); });
    $(sharedAudio).on("pause ended", function () { setPlayButton($button, false); });
    $(sharedAudio).on("timeupdate", function () {
        if (onTime) onTime(sharedAudio.currentTime, sharedAudio.duration);
    });
    sharedAudio.play().catch(function () { showToast("This clip couldn't play in your browser.", "error"); });
}

/* admin only helpers: publish toggle and delete. the backend checks the role on every call */
function setPublishState(kind, item, publish) {
    const path = "/" + kind + "/" + item.id + (publish ? "/publish" : "/unpublish");
    return apiPatch(path).then(function (res) {
        if (kind === "promos") clearPromoCache();
        showToast(publish ? "Published. Residents got a notification." : "Unpublished. Residents can't see it now.", "success");
        return res.data;
    });
}

function deleteMedia(kind, item) {
    const noun = kind === "promos" ? "promo" : "announcement";
    return confirmDialog({
        title: "Delete " + item.title + "?",
        message: "This removes the " + noun + " for everyone. It can't be undone.",
        confirmText: "Delete " + noun,
        cancelText: "Cancel",
        danger: true,
    }).then(function (ok) {
        if (!ok) return false;
        return apiDelete("/" + kind + "/" + item.id).then(function () {
            if (kind === "promos") clearPromoCache();
            showToast("Deleted.", "success");
            return true;
        }).catch(function (err) {
            showToast(err.message, "error");
            return false;
        });
    });
}

/* captions: the backend only stores plain caption text, so I turn it into a WebVTT track.
   if the admin pasted a real WEBVTT file I use it as is, otherwise the sentences get spread
   evenly over the video length */
function captionsToVtt(text, duration) {
    text = String(text || "").trim();
    if (text.indexOf("WEBVTT") === 0) return text;

    const lines = text.split(/(?<=[.!?])\s+|\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return "";
    const total = isFinite(duration) && duration > 0 ? duration : lines.length * 4;
    const each = total / lines.length;

    let vtt = "WEBVTT\n\n";
    lines.forEach(function (line, i) {
        vtt += vttTime(i * each) + " --> " + vttTime((i + 1) * each) + "\n" + line + "\n\n";
    });
    return vtt;
}

function vttTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = (seconds % 60).toFixed(3);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + s.padStart(6, "0");
}

// readable transcript from the caption text (drops the WEBVTT timings if there are any)
function captionsToTranscript(text) {
    return String(text || "")
        .split("\n")
        .filter(function (line) { return line.trim() && line.indexOf("-->") === -1 && line.trim() !== "WEBVTT" && !/^\d+$/.test(line.trim()); })
        .join(" ");
}

// video thumbnail: the first frame of the clip, with a play badge, CC badge and duration
function videoThumb(promo, big) {
    return (
        '<div class="relative aspect-video overflow-hidden bg-ink">' +
            '<video class="size-full object-cover" src="' + escapeHtml(promo.video_url) + '#t=0.5" preload="metadata" muted playsinline aria-hidden="true" tabindex="-1"></video>' +
            '<span class="absolute inset-0 bg-linear-to-t from-jacaranda-deep/70 via-transparent to-transparent"></span>' +
            '<span class="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-jacaranda shadow-lg transition group-hover:scale-110 group-hover:bg-white ' + (big ? "size-20" : "size-14") + '">' +
                icon("play", "*:fill-current translate-x-0.5 " + (big ? "size-8" : "size-6")) + "</span>" +
            (promo.caption_text ? '<span class="absolute bottom-3 left-3 rounded-md bg-ink/85 px-2 py-0.5 text-xs font-bold text-white">CC<span class="sr-only"> captions available</span></span>' : "") +
            '<span class="absolute right-3 bottom-3 rounded-md bg-ink/85 px-2 py-0.5 text-xs font-bold text-white tabular-nums" data-video-duration="' + escapeHtml(promo.video_url) + '" hidden></span>' +
        "</div>"
    );
}

// fill the duration badges once the video metadata loads
function fillVideoDurations($root) {
    $root.find("[data-video-duration]").each(function () {
        const $badge = $(this);
        readDuration($badge.data("video-duration"), "video", function (d) { $badge.text(formatSeconds(d)).prop("hidden", false); });
    });
}

/* promos cache: the list is kept in sessionStorage for 5 minutes so moving between the promo
   pages doesn't refetch it every time. anything that changes a promo calls clearPromoCache() */
const PROMO_CACHE_KEY = "jc_promos_cache";
const PROMO_CACHE_MS = 5 * 60 * 1000;

function getPromos() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(PROMO_CACHE_KEY) || "null");
        if (cached && Date.now() - cached.savedAt < PROMO_CACHE_MS) return Promise.resolve(cached.promos);
    } catch (e) { /* broken cache, just fetch again */ }

    return apiGet("/promos", { limit: 100 }).then(function (res) {
        const list = res.data || [];
        try { sessionStorage.setItem(PROMO_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), promos: list })); } catch (e) { /* storage full or blocked */ }
        return list;
    });
}

function clearPromoCache() {
    try { sessionStorage.removeItem(PROMO_CACHE_KEY); } catch (e) { /* nothing to clear */ }
}
