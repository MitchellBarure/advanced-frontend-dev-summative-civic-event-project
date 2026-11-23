const notificationId = new URLSearchParams(location.search).get("id");
let notification = null;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    applyRoleVisibility();

    if (!notificationId) {
        showNotFound();
        return;
    }
    $("#delete-notification").on("click", function () {
        deleteNotification(notification).then(function (deleted) {
            if (!deleted) return;
            flash("Notification deleted.", "success");
            window.location.href = "notifications.html";
        });
    });
    loadNotification();
});

function loadNotification() {
    $("#detail-loading").prop("hidden", false);
    $("#detail-error").prop("hidden", true);

    apiGet("/notifications/" + notificationId)
        .then(function (res) {
            notification = res.data;
            // a message sent to one person is only theirs to read (admins can see everything)
            const me = getUser();
            if (notification.recipient_id && notification.recipient_id !== me.id && !isAdmin()) {
                showNotFound();
                return;
            }
            renderNotification();
            markRead([notification.id]);
        })
        .catch(function (err) {
            $("#detail-loading").prop("hidden", true);
            if (err.status === 404) { showNotFound(); return; }
            showError($("#detail-error").prop("hidden", false), "Couldn't load this notification. " + err.message, loadNotification);
        });
}

function showNotFound() {
    $("#detail-loading").prop("hidden", true);
    $("#crumb-title").text("Not found");
    $("#detail-error").prop("hidden", false).html(emptyState(
        "We couldn't find that notification",
        "It may have been deleted.",
        '<a href="notifications.html" class="btn-primary">All notifications</a>'
    ));
}

function renderNotification() {
    const n = notification;
    document.title = n.title + " · Jacaranda City";
    $("#crumb-title").text(n.title);
    $("#title").text(n.title);
    $("#type").text(notificationType(n).label);
    $("#sent").text((n.recipient_id ? "Sent to you" : "Sent to everyone") + " · " + formatDateTime(n.created_at));
    $("#message").text(n.message);

    const link = relatedLink(n);
    if (link) $("#related").attr("href", link.href).html(escapeHtml(link.label) + icon("arrow-right", "size-4")).prop("hidden", false);

    $("#detail-loading").prop("hidden", true);
    $("#detail").prop("hidden", false);
}
