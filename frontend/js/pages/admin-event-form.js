// same limits as the backend's multer config, so people find out before uploading
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

const editId = new URLSearchParams(location.search).get("id");
let chosenImage = null;
let existingImageUrl = null;

$(function () {
    // admin only page: creating and editing events
    if (!requireAdmin()) return;
    renderAdminSidebar("events");
    fillIcons();

    $("#image").on("change", function () { pickImage(this.files[0]); });
    bindDropZone();
    $("#published").on("click", function () {
        setPublished($(this).attr("aria-checked") !== "true");
    });
    $("#ends_at, #starts_at").on("change", checkDates);
    $("#event-form").on("submit", saveEvent);

    if (editId) loadEventForEdit();
});

function loadEventForEdit() {
    document.title = "Edit event · Jacaranda City";
    $("#form-title").text("Edit event");
    $("#save-button").text("Save changes");
    $("#event-form").prop("hidden", true);
    $("#form-loading").prop("hidden", false);

    apiGet("/events/" + editId)
        .then(function (res) {
            const e = res.data;
            $("#title").val(e.title);
            $("#description").val(e.description || "");
            $("#location").val(e.location || "");
            $("#starts_at").val(toInputValue(e.starts_at));
            $("#ends_at").val(toInputValue(e.ends_at));
            setPublished(isPublished(e));
            existingImageUrl = e.metadata && e.metadata.image_url;
            if (existingImageUrl) showPreview(existingImageUrl, "Current image");
            $("#form-loading").prop("hidden", true);
            $("#event-form").prop("hidden", false);
        })
        .catch(function (err) {
            $("#form-loading").prop("hidden", true);
            showError($("#form-error").prop("hidden", false), "Couldn't load this event. " + err.message, function () {
                $("#form-error").prop("hidden", true);
                loadEventForEdit();
            });
        });
}

// datetime-local wants "2026-11-29T10:00" in SA time
function toInputValue(iso) {
    if (!iso) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: SA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso));
    const get = function (type) { return parts.find(function (p) { return p.type === type; }).value; };
    return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}

// and back again: the form time is SA time (UTC+2, no daylight saving), the backend wants UTC
function toIsoFromInput(value) {
    return new Date(value + ":00+02:00").toISOString();
}

function setPublished(on) {
    $("#published").attr("aria-checked", String(on)).toggleClass("bg-jacaranda", on).toggleClass("bg-ink/20", !on);
    $("#published .switch-knob").toggleClass("left-7", on).toggleClass("left-1", !on);
}

function bindDropZone() {
    const $zone = $("#drop-zone");
    $zone.on("dragover dragenter", function (e) {
        e.preventDefault();
        $zone.addClass("border-jacaranda bg-jacaranda-mist");
    });
    $zone.on("dragleave drop", function () { $zone.removeClass("border-jacaranda bg-jacaranda-mist"); });
    $zone.on("drop", function (e) {
        e.preventDefault();
        const file = e.originalEvent.dataTransfer.files[0];
        if (file) pickImage(file);
    });
}

// check type and size before anything gets uploaded
function pickImage(file) {
    setFieldError($("#image"), "");
    if (!file) return;
    if (IMAGE_TYPES.indexOf(file.type) === -1) {
        setFieldError($("#image"), "That file type won't work. Use a JPG, PNG or GIF.");
        $("#image").val("");
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        setFieldError($("#image"), "That image is " + (file.size / 1024 / 1024).toFixed(1) + " MB. The limit is 2 MB.");
        $("#image").val("");
        return;
    }
    chosenImage = file;
    const reader = new FileReader();
    reader.onload = function () { showPreview(reader.result, "New image: " + file.name, true); };
    reader.readAsDataURL(file);
}

function showPreview(src, caption, removable) {
    $("#preview").html(
        '<img src="' + escapeHtml(src) + '" alt="Preview of the event image" class="absolute inset-0 size-full object-cover">' +
        '<div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-ink/80 to-transparent p-3 pt-8">' +
            '<span class="truncate text-sm font-semibold text-white"></span>' +
            (removable ? '<button type="button" id="remove-image" class="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-blush">Remove</button>' : "") +
        "</div>"
    );
    $("#preview span").first().text(caption);
    $("#remove-image").on("click", function () {
        chosenImage = null;
        $("#image").val("");
        if (existingImageUrl) showPreview(existingImageUrl, "Current image");
        else $("#preview").html('<span class="flex flex-col items-center gap-2">' + icon("image", "size-6") + "Preview shows here</span>");
        $("#image").trigger("focus");
    });
}

function checkDates() {
    const start = $("#starts_at").val();
    const end = $("#ends_at").val();
    if (start && end && end <= start) {
        setFieldError($("#ends_at"), "End must be after the start.");
        return false;
    }
    setFieldError($("#ends_at"), "");
    return true;
}

function validateForm() {
    clearFieldErrors($("#event-form"));
    let ok = true;
    if (!$("#title").val().trim()) { setFieldError($("#title"), "Give the event a title."); ok = false; }
    if (!$("#location").val().trim()) { setFieldError($("#location"), "Where is it happening?"); ok = false; }
    if (!$("#starts_at").val()) { setFieldError($("#starts_at"), "Pick a start date and time."); ok = false; }
    if (!$("#ends_at").val()) { setFieldError($("#ends_at"), "Pick an end date and time."); ok = false; }
    if (ok && !checkDates()) ok = false;
    return ok;
}

function saveEvent(e) {
    e.preventDefault();
    $("#form-banner").prop("hidden", true);
    if (!validateForm()) {
        $("#event-form [aria-invalid]").first().trigger("focus");
        return;
    }

    // multipart because of the image. the backend reads the file from the "image" field
    const data = new FormData();
    data.append("title", $("#title").val().trim());
    data.append("description", $("#description").val().trim());
    data.append("location", $("#location").val().trim());
    data.append("starts_at", toIsoFromInput($("#starts_at").val()));
    data.append("ends_at", toIsoFromInput($("#ends_at").val()));
    data.append("published", $("#published").attr("aria-checked"));
    if (chosenImage) data.append("image", chosenImage);

    const $button = $("#save-button");
    setLoading($button, true, chosenImage ? "Uploading…" : "Saving…");
    if (chosenImage) $("#progress-wrap").prop("hidden", false);

    const request = editId
        ? apiPut("/events/" + editId, data, { onProgress: showProgress })
        : apiPost("/events", data, { onProgress: showProgress });

    request
        .then(function (res) {
            flash(editId ? "Changes saved." : "Event created. Residents got a notification about it.", "success");
            window.location.href = editId ? "../event.html?id=" + editId : "events.html";
        })
        .catch(function (err) {
            setLoading($button, false);
            $("#progress-wrap").prop("hidden", true);
            $("#form-banner").text(err.message).prop("hidden", false);
        });
}

function showProgress(percent) {
    $("#progress-bar").css("width", percent + "%");
    $("#progress-wrap [role=progressbar]").attr("aria-valuenow", percent);
    $("#progress-text").text(percent < 100 ? "Uploading… " + percent + "%" : "Upload done, saving…");
}
