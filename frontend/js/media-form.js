// Bits shared by the announcement and promo forms (admin only pages).
// Both forms use the same ids: #media, #drop-zone, #preview, #preview-player, #published, #progress-*

let chosenFile = null;

function setPublished(on) {
    $("#published").attr("aria-checked", String(on)).toggleClass("bg-jacaranda", on).toggleClass("bg-ink/20", !on);
    $("#published .switch-knob").toggleClass("left-7", on).toggleClass("left-1", !on);
}

function isPublishedOn() {
    return $("#published").attr("aria-checked") === "true";
}

// rules = { extensions: [".mp3", ...], maxMb: 5, kind: "audio" | "video" }
function bindMediaPicker(rules) {
    $("#published").on("click", function () { setPublished(!isPublishedOn()); });
    $("#media").on("change", function () { pickMedia(this.files[0], rules); });
    $("#remove-media").on("click", clearMedia);

    const $zone = $("#drop-zone");
    $zone.on("dragover dragenter", function (e) {
        e.preventDefault();
        $zone.addClass("border-jacaranda bg-jacaranda-mist");
    });
    $zone.on("dragleave drop", function () { $zone.removeClass("border-jacaranda bg-jacaranda-mist"); });
    $zone.on("drop", function (e) {
        e.preventDefault();
        const file = e.originalEvent.dataTransfer.files[0];
        if (file) pickMedia(file, rules);
    });
}

// same type + size limits as the backend's multer config, checked before anything uploads
function pickMedia(file, rules) {
    setFieldError($("#media"), "");
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (rules.extensions.indexOf(ext) === -1) {
        setFieldError($("#media"), "That file type won't work. Use " + rules.extensions.join(", ").toUpperCase().replace(/\./g, "") + ".");
        $("#media").val("");
        return;
    }
    if (file.size > rules.maxMb * 1024 * 1024) {
        setFieldError($("#media"), "That file is " + (file.size / 1024 / 1024).toFixed(1) + " MB. The limit is " + rules.maxMb + " MB.");
        $("#media").val("");
        return;
    }
    chosenFile = file;
    showMediaPreview(URL.createObjectURL(file), file.name, (file.size / 1024 / 1024).toFixed(1) + " MB", true);
}

function showMediaPreview(url, name, meta, removable) {
    const player = $("#preview-player")[0];
    player.src = url;
    $("#preview-name").text(name);
    $("#preview-meta").text(meta ? "· " + meta : "");
    $("#remove-media").prop("hidden", !removable);
    $("#preview").prop("hidden", false);
    $(player).one("loadedmetadata", function () {
        $("#preview-meta").text((meta ? "· " + meta + " · " : "· ") + formatSeconds(player.duration));
    });
}

function clearMedia() {
    chosenFile = null;
    $("#media").val("");
    $("#preview-player")[0].pause();
    $("#preview").prop("hidden", true);
    $("#media").trigger("focus");
}

function showProgress(percent) {
    $("#progress-wrap").prop("hidden", false);
    $("#progress-bar").css("width", percent + "%");
    $("#progress-wrap [role=progressbar]").attr("aria-valuenow", percent);
    $("#progress-text").text(percent < 100 ? "Uploading… " + percent + "%" : "Upload done, saving…");
}

function showFormBanner(message) {
    $("#progress-wrap").prop("hidden", true);
    $("#form-banner").text(message).prop("hidden", false);
}
