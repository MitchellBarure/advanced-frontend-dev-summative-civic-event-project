const editId = new URLSearchParams(location.search).get("id");

$(function () {
    // admin only page: creating and editing promos
    if (!requireAdmin()) return;
    renderAdminSidebar("promos");
    fillIcons();

    bindMediaPicker({ extensions: [".mp4", ".mov", ".avi", ".mkv"], maxMb: 8, kind: "video" });
    $("#promo-form").on("submit", savePromo);

    if (editId) loadForEdit();
});

function loadForEdit() {
    document.title = "Edit promo · Jacaranda City";
    $("#form-title").text("Edit promo");
    $("#save-button").text("Save changes");
    $("#promo-form").prop("hidden", true);
    $("#form-loading").prop("hidden", false);

    apiGet("/promos/" + editId)
        .then(function (res) {
            const p = res.data;
            $("#title").val(p.title);
            $("#description").val(p.description || "");
            $("#caption_text").val(p.caption_text || "");
            setPublished(isLive(p));
            showMediaPreview(p.video_url, "Current video", "", false);
            $("#form-loading").prop("hidden", true);
            $("#promo-form").prop("hidden", false);
        })
        .catch(function (err) {
            $("#form-loading").prop("hidden", true);
            showError($("#form-error").prop("hidden", false), "Couldn't load this promo. " + err.message, function () {
                $("#form-error").prop("hidden", true);
                loadForEdit();
            });
        });
}

function validateForm() {
    clearFieldErrors($("#promo-form"));
    let ok = true;
    if (!$("#title").val().trim()) { setFieldError($("#title"), "Give the promo a title."); ok = false; }
    if (!$("#description").val().trim()) { setFieldError($("#description"), "Add a line or two about the video."); ok = false; }
    if (!editId && !chosenFile) { setFieldError($("#media"), "Add the video file."); ok = false; }
    if (!$("#caption_text").val().trim()) { setFieldError($("#caption_text"), "Captions are needed so everyone can follow the video."); ok = false; }
    return ok;
}

function savePromo(e) {
    e.preventDefault();
    $("#form-banner").prop("hidden", true);
    if (!validateForm()) {
        $("#promo-form [aria-invalid]").first().trigger("focus");
        return;
    }

    // multipart because of the video. the backend reads the file from the "video" field
    const data = new FormData();
    data.append("title", $("#title").val().trim());
    data.append("description", $("#description").val().trim());
    data.append("caption_text", $("#caption_text").val().trim());
    if (editId) data.append("published", String(isPublishedOn()));
    if (chosenFile) data.append("video", chosenFile);

    const $button = $("#save-button");
    setLoading($button, true, chosenFile ? "Uploading…" : "Saving…");

    const request = editId
        ? apiPut("/promos/" + editId, data, { onProgress: chosenFile ? showProgress : null })
        : apiPost("/promos", data, { onProgress: showProgress }).then(saveAsDraftIfNeeded);

    request
        .then(function (res) {
            clearPromoCache(); // so the promo pages show the change straight away
            const id = editId || res.data.id;
            flash(editId ? "Changes saved." : isPublishedOn() ? "Promo saved. Residents got a notification about it." : "Saved as a draft.", "success");
            window.location.href = "../promo.html?id=" + id;
        })
        .catch(function (err) {
            setLoading($button, false);
            showFormBanner(err.message);
        });
}

// the backend's create always publishes, so a draft gets unpublished straight after
function saveAsDraftIfNeeded(res) {
    if (isPublishedOn()) return res;
    return apiPatch("/promos/" + res.data.id + "/unpublish").then(function () { return res; });
}
