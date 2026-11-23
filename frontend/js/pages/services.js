$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();

    $("#type").append(SERVICE_TYPES.map(function (t) {
        return '<option value="' + escapeHtml(t.value) + '">' + escapeHtml(t.label) + "</option>";
    }).join(""));
    $("#request-form").on("submit", submitRequest);

    renderMyRequests();
});

function validateRequest() {
    clearFieldErrors($("#request-form"));
    let ok = true;
    if (!$("#type").val()) { setFieldError($("#type"), "Pick the type of problem."); ok = false; }
    if ($("#title").val().trim().length < 4) { setFieldError($("#title"), "Give it a short title (at least 4 characters)."); ok = false; }
    if (!$("#address").val().trim()) { setFieldError($("#address"), "Where is it? A street and suburb is enough."); ok = false; }
    if ($("#details").val().trim().length < 10) { setFieldError($("#details"), "Tell us a bit more (at least 10 characters)."); ok = false; }
    return ok;
}

function submitRequest(e) {
    e.preventDefault();
    if (!validateRequest()) {
        $("#request-form [aria-invalid]").first().trigger("focus");
        return;
    }
    try {
        const request = addRequest({
            type: $("#type").val(),
            title: $("#title").val().trim(),
            address: $("#address").val().trim(),
            details: $("#details").val().trim(),
        });
        $("#request-form")[0].reset();
        renderMyRequests();
        showToast("Request " + request.ref + " sent. We'll update you here.", "success");
    } catch (err) {
        showToast("Couldn't save your request in this browser. Check that site storage isn't blocked.", "error");
    }
}

function renderMyRequests() {
    const list = myRequests();
    const $list = $("#my-requests");
    if (!list.length) {
        $list.html('<li class="rounded-2xl border border-dashed border-line px-6 py-10 text-center">' +
            '<span class="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-jacaranda-mist text-jacaranda">' + icon("clipboard-list", "size-6") + "</span>" +
            '<p class="font-semibold">No requests yet</p><p class="mt-1 text-sm text-muted">Anything you report shows up here with its status.</p></li>');
        return;
    }
    $list.html(list.map(function (r) {
        const type = serviceType(r.type);
        return '<li class="flex items-center gap-4 rounded-2xl border border-line p-4">' +
            '<span class="grid size-12 shrink-0 place-items-center rounded-xl bg-jacaranda-mist text-jacaranda" title="' + escapeHtml(type.label) + '">' + icon(type.icon, "size-6") + "</span>" +
            '<div class="min-w-0 flex-1">' +
                '<p class="truncate font-bold">' + escapeHtml(r.title) + "</p>" +
                '<p class="eyebrow mt-0.5 text-muted">' + escapeHtml(r.ref) + " · " + escapeHtml(formatWith(r.created_at, { day: "numeric", month: "short" })) + '<span class="sr-only"> · ' + escapeHtml(type.label) + "</span></p>" +
                '<p class="truncate text-sm text-muted">' + escapeHtml(r.address) + "</p>" +
            "</div>" +
            requestStatusChip(r.status) +
        "</li>";
    }).join(""));
}
