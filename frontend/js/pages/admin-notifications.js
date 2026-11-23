let allNotifications = [];

$(function () {
    // admin only page: see and delete every notification
    if (!requireAdmin()) return;
    renderAdminSidebar("notifications");
    fillIcons();
    showFlash();

    $("#search").on("input", renderRows);
    $("#type-filter").on("change", renderRows);
    $("#notification-rows").on("click", ".delete-notification", function () {
        removeNotification($(this).data("id"));
    });

    loadRows();
});

function loadRows() {
    $("#notification-rows").attr("aria-busy", "true").html("<li>" + skeletonRows(4) + "</li>");
    loadNotifications()
        .then(function (list) {
            allNotifications = list;
            renderRows();
        })
        .catch(function (err) {
            $("#notification-rows").html('<li class="pt-4"><div id="rows-error"></div></li>');
            showError($("#rows-error"), "Couldn't load notifications. " + err.message, loadRows);
        });
}

function renderRows() {
    const q = $("#search").val().trim().toLowerCase();
    const type = $("#type-filter").val();
    const rows = allNotifications.filter(function (n) {
        const text = (n.title + " " + n.message).toLowerCase();
        return (!type || n.type === type) && (!q || text.indexOf(q) !== -1);
    });

    $("#showing").text("Showing " + rows.length + " of " + allNotifications.length);
    const $list = $("#notification-rows").attr("aria-busy", "false");

    if (!allNotifications.length) {
        $list.html('<li class="pt-4">' + emptyState("No notifications", "They're created automatically when you add an event, announcement or promo.") + "</li>");
        return;
    }
    if (!rows.length) {
        $list.html('<li class="py-10 text-center text-muted">Nothing matches that search.</li>');
        return;
    }

    $list.html(rows.map(function (n) {
        const link = relatedLink(n);
        return '<li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">' +
            '<span class="chip w-16 justify-center bg-jacaranda-mist text-jacaranda-deep">' + escapeHtml(notificationType(n).label) + "</span>" +
            '<div class="min-w-0 flex-1">' +
                '<p class="font-bold"><a href="../notification.html?id=' + n.id + '" class="hover:text-jacaranda">' + escapeHtml(n.title) + "</a></p>" +
                '<p class="truncate text-sm text-muted">' + escapeHtml(n.message) + "</p>" +
                '<p class="mt-0.5 text-sm text-muted">' + (n.recipient_id ? "One resident" : "Everyone") + " · " + escapeHtml(notificationTime(n.created_at)) + "</p>" +
            "</div>" +
            (link ? '<a href="' + link.href + '" class="btn-ghost min-h-9 px-3 text-sm">' + icon("external-link", "size-4") + "Open item</a>" : "") +
            '<button type="button" class="delete-notification btn-ghost min-h-9 px-3 text-sm text-danger hover:bg-blush/60" data-id="' + n.id + '" aria-label="Delete ' + escapeHtml(n.title) + '">' + icon("trash-2", "size-4") + "Delete</button>" +
        "</li>";
    }).join(""));
}

function removeNotification(id) {
    const n = allNotifications.find(function (item) { return item.id === id; });
    deleteNotification(n).then(function (deleted) {
        if (!deleted) return;
        allNotifications = allNotifications.filter(function (item) { return item.id !== id; });
        renderRows();
    });
}
