const editId = new URLSearchParams(location.search).get("id");

$(function () {
    // admin only page: creating and editing announcements
    if (!requireAdmin()) return;
    renderAdminSidebar("announcements");
    fillIcons();

    bindMediaPicker({ extensions: [".mp3", ".wav", ".m4a", ".ogg"], maxMb: 5, kind: "audio" });
    $("#announcement-form").on("submit", saveAnnouncement);

    if (editId) loadForEdit();
});

function loadForEdit() {
    document.title = "Edit announcement · Jacaranda City";
    $("#form-title").text("Edit announcement");
    $("#save-button").text("Save changes");
    $("#announcement-form").prop("hidden", true);
    $("#form-loading").prop("hidden", false);

    apiGet("/announcements/" + editId)
        .then(function (res) {
            const a = res.data;
            $("#title").val(a.title);
            setPublished(isLive(a));
            // the backend's update ignores a new file, so on edit the recording is fixed
            $("#drop-zone").prop("hidden", true);
            $("#edit-audio-note").prop("hidden", false);
            $("#media-help").prop("hidden", true);
            showMediaPreview(a.audio_url, "Current recording", "", false);
            $("#form-loading").prop("hidden", true);
            $("#announcement-form").prop("hidden", false);
        })
        .catch(function (err) {
            $("#form-loading").prop("hidden", true);
            showError($("#form-error").prop("hidden", false), "Couldn't load this announcement. " + err.message, function () {
                $("#form-error").prop("hidden", true);
                loadForEdit();
            });
        });
}

function validateForm() {
    clearFieldErrors($("#announcement-form"));
    let ok = true;
    if (!$("#title").val().trim()) { setFieldError($("#title"), "Give the announcement a title."); ok = false; }
    if (!editId && !chosenFile) { setFieldError($("#media"), "Add the audio file."); ok = false; }
    return ok;
}

function saveAnnouncement(e) {
    e.preventDefault();
    $("#form-banner").prop("hidden", true);
    if (!validateForm()) {
        $("#announcement-form [aria-invalid]").first().trigger("focus");
        return;
    }

    // multipart because of the audio. the backend reads the file from the "audio" field
    const data = new FormData();
    data.append("title", $("#title").val().trim());
    data.append("published", String(isPublishedOn()));
    if (chosenFile) data.append("audio", chosenFile);

    const $button = $("#save-button");
    setLoading($button, true, chosenFile ? "Uploading…" : "Saving…");

    const request = editId
        ? apiPut("/announcements/" + editId, data)
        : apiPost("/announcements", data, { onProgress: showProgress });

    request
        .then(function (res) {
            const id = editId || res.data.id;
            flash(editId ? "Changes saved." : "Announcement saved. Residents got a notification about it.", "success");
            window.location.href = "../announcement.html?id=" + id;
        })
        .catch(function (err) {
            setLoading($button, false);
            showFormBanner(err.message);
        });
}
