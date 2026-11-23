let inbox = [];

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    showFlash();

    $("#mark-all").on("click", function () {
        markRead(inbox.map(function (n) { return n.id; }));
        renderInbox();
        showToast("All caught up.", "success");
    });
    $("#inbox").on("click", ".delete-notification", function () { removeNotification($(this).data("id")); });

    loadInbox();
});

function loadInbox() {
    $("#inbox").attr("aria-busy", "true").html(
        '<div class="space-y-4">' +
            '<div class="flex gap-3"><div class="skeleton size-11 rounded-full"></div><div class="skeleton h-28 w-full max-w-xl rounded-2xl"></div></div>' +
            '<div class="flex gap-3"><div class="skeleton size-11 rounded-full"></div><div class="skeleton h-28 w-full max-w-md rounded-2xl"></div></div>' +
        "</div>"
    );
    loadNotifications()
        .then(function (list) {
            inbox = list;
            renderInbox();
        })
        .catch(function (err) {
            $("#unread-summary").text("");
            showError($("#inbox"), "Couldn't load your notifications. " + err.message, loadInbox);
        });
}

function renderInbox() {
    const unread = inbox.filter(function (n) { return !isRead(n); }).length;
    $("#unread-summary").text("Your notifications · " + unread + " unread");
    $("#mark-all").prop("disabled", unread === 0);

    const $inbox = $("#inbox").attr("aria-busy", "false");
    if (!inbox.length) {
        $inbox.html(emptyState("No notifications yet", "When the city adds an event, announcement or promo, you'll hear about it here."));
        return;
    }

    // group by day, like a chat: Today, Yesterday, then the date
    let html = "";
    let lastDay = null;
    inbox.forEach(function (n) {
        const day = dayHeading(n.created_at);
        if (day !== lastDay) {
            if (lastDay !== null) html += "</ul>";
            html += '<h2 class="mx-auto my-4 w-fit rounded-full bg-white/80 px-4 py-1 text-sm font-semibold text-muted first:mt-0">' + escapeHtml(day) + "</h2>" +
                '<ul class="space-y-4">';
            lastDay = day;
        }
        html += notificationBubble(n);
    });
    $inbox.html(html + "</ul>");
    applyRoleVisibility($inbox);
}

function dayHeading(iso) {
    const days = -daysUntil(iso);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return formatLongDate(iso);
}

// admin only (the Delete button is only rendered for admins)
function removeNotification(id) {
    const n = inbox.find(function (item) { return item.id === id; });
    deleteNotification(n).then(function (deleted) {
        if (!deleted) return;
        inbox = inbox.filter(function (item) { return item.id !== id; });
        renderInbox();
    });
}
