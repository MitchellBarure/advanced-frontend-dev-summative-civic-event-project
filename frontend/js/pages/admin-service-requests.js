let statusFilter = "all";

$(function () {
    // admin only page: every resident's service requests + changing their status
    if (!requireAdmin()) return;
    renderAdminSidebar("services");
    fillIcons();

    $(".status-tab").on("click", function () {
        statusFilter = $(this).data("status");
        renderRequests();
    });
    // arrow keys move between the tabs
    $(".status-tab").on("keydown", function (e) {
        const $tabs = $(".status-tab");
        const i = $tabs.index(this);
        if (e.key === "ArrowRight") $tabs.eq((i + 1) % $tabs.length).trigger("focus").trigger("click");
        if (e.key === "ArrowLeft") $tabs.eq((i - 1 + $tabs.length) % $tabs.length).trigger("focus").trigger("click");
    });
    $("#request-rows").on("change", ".status-select", function () {
        // attr, not .data(): jQuery turns "1795…" into a number and the id match fails
        const updated = updateRequestStatus($(this).attr("data-id"), this.value);
        if (updated) showToast(updated.ref + " is now " + serviceStatus(updated.status).label.toLowerCase() + ".", "success");
        renderRequests();
    });

    renderRequests();
});

function renderRequests() {
    const all = allRequests();

    $(".status-tab").each(function () {
        const status = $(this).data("status");
        const count = status === "all" ? all.length : all.filter(function (r) { return r.status === status; }).length;
        const selected = status === statusFilter;
        const label = status === "all" ? "All" : serviceStatus(status).label;
        $(this).text(label + " (" + count + ")")
            .attr("aria-selected", String(selected)).attr("tabindex", selected ? "0" : "-1")
            .attr("class", "status-tab btn " + (selected ? "bg-ink text-white" : "border border-ink/20 bg-white text-ink hover:bg-canvas"));
    });

    const rows = all.filter(function (r) { return statusFilter === "all" || r.status === statusFilter; });
    const $body = $("#request-rows");
    if (!rows.length) {
        $body.html('<tr><td colspan="6" class="px-5 py-14 text-center">' +
            '<span class="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-jacaranda-mist text-jacaranda">' + icon("clipboard-list", "size-6") + "</span>" +
            '<p class="font-semibold">' + (all.length ? "No requests with this status" : "No service requests yet") + "</p>" +
            '<p class="mt-1 text-sm text-muted">Requests residents send from the Services page show up here.</p></td></tr>');
        return;
    }

    $body.html(rows.map(function (r) {
        const type = serviceType(r.type);
        return "<tr>" +
            '<td class="px-5 py-4 font-bold whitespace-nowrap">' + escapeHtml(r.ref) + "</td>" +
            '<td class="max-w-xs px-5 py-4"><p class="font-semibold">' + escapeHtml(r.title) + '</p><p class="text-sm text-muted">' + escapeHtml(r.address) + "</p>" +
                '<details class="mt-1 text-sm"><summary class="cursor-pointer font-semibold text-jacaranda-deep">Details</summary><p class="mt-1 whitespace-pre-line text-muted">' + escapeHtml(r.details) + "</p></details></td>" +
            '<td class="px-5 py-4"><span class="flex items-center gap-2 text-sm">' + icon(type.icon, "size-4 text-jacaranda") + escapeHtml(r.type) + "</span></td>" +
            '<td class="px-5 py-4 text-sm">' + escapeHtml(r.user_name) + "</td>" +
            '<td class="px-5 py-4 text-sm whitespace-nowrap">' + escapeHtml(formatWith(r.created_at, { day: "numeric", month: "short" })) + "</td>" +
            '<td class="px-5 py-4">' +
                '<label for="status-' + r.id + '" class="sr-only">Status of ' + escapeHtml(r.ref) + "</label>" +
                '<select id="status-' + r.id + '" class="status-select input min-h-10 w-40 py-1.5 text-sm" data-id="' + r.id + '">' +
                    SERVICE_STATUSES.map(function (s) {
                        return '<option value="' + s.value + '"' + (s.value === r.status ? " selected" : "") + ">" + s.label + "</option>";
                    }).join("") +
                "</select></td>" +
        "</tr>";
    }).join(""));
}
