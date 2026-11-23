const userId = new URLSearchParams(location.search).get("id");
let viewedUser = null;

$(function () {
    // admin only page: one account, read only, plus the Active switch
    if (!requireAdmin()) return;
    renderAdminSidebar("users");
    fillIcons();

    if (!userId) {
        showNotFound();
        return;
    }
    $("#active-switch").on("click", ".toggle-switch", toggleActive);
    loadUser();
});

function loadUser() {
    $("#user-loading").prop("hidden", false);
    $("#user-error").prop("hidden", true);
    apiGet("/users/" + userId)
        .then(function (res) {
            viewedUser = res.data;
            renderUser();
            loadRegistrations();
        })
        .catch(function (err) {
            $("#user-loading").prop("hidden", true);
            if (err.status === 404) { showNotFound(); return; }
            showError($("#user-error").prop("hidden", false), "Couldn't load this user. " + err.message, loadUser);
        });
}

function showNotFound() {
    $("#user-loading").prop("hidden", true);
    $("#user-error").prop("hidden", false).html(emptyState("We couldn't find that user", "They may have been removed.", '<a href="users.html" class="btn-primary">All users</a>'));
}

function renderUser() {
    const u = viewedUser;
    const isMe = u.id === getUser().id;
    document.title = u.full_name + " · Jacaranda City";
    $("#user-avatar").html(avatar(u.full_name, "lg"));
    $("#user-name").text(u.full_name);
    $("#user-chips").html(roleChip(u.role) + accountChip(u.is_active));
    $("#user-full-name").text(u.full_name);
    $("#user-email").text(u.email);
    $("#user-role").html(escapeHtml(u.role.charAt(0).toUpperCase() + u.role.slice(1)) + '<span class="ml-auto eyebrow text-muted">Can\'t be changed</span>');
    $("#user-joined").text(formatWith(u.created_at, { day: "numeric", month: "short", year: "numeric" }));
    // admins can't switch themselves off
    $("#active-switch").html(switchMarkup(u.is_active, 'aria-labelledby="active-label" aria-describedby="active-help"' + (isMe ? " disabled" : "")));
    if (isMe) $("#active-help").text("This is your own account, so you can't turn it off.");

    $("#user-loading").prop("hidden", true);
    $("#user-card").prop("hidden", false);
}

function toggleActive() {
    const $switch = $(this).prop("disabled", true);
    setAccountActive(viewedUser, !viewedUser.is_active).then(function (updated) {
        if (updated) viewedUser = updated;
        renderUser();
        $("#active-switch .toggle-switch").trigger("focus");
    });
}

// there's no "registrations for user X" endpoint, so I go through each event's attendees
function loadRegistrations() {
    const $list = $("#user-registrations").html("<li>" + skeletonRows(2) + "</li>");
    $("#registrations-card").prop("hidden", false);
    loadAllRegistrations()
        .then(function (result) {
            const mine = result.registrations
                .filter(function (r) { return r.user_id === viewedUser.id; })
                .sort(function (a, b) { return byStartDate(a.event, b.event); });
            $("#registrations-heading").text("Their registrations (" + mine.length + ")");
            if (!mine.length) {
                $list.html('<li class="py-6 text-muted">Not registered for any events.</li>');
                return;
            }
            $list.html(mine.map(function (r) {
                return '<li class="flex items-center justify-between gap-4 py-3">' +
                    '<a href="../event.html?id=' + r.event.id + '" class="font-semibold hover:text-jacaranda">' + escapeHtml(r.event.title) + "</a>" +
                    '<span class="shrink-0 text-sm text-muted">' + escapeHtml(formatDay(r.event.starts_at)) + (isPast(r.event) ? " · ended" : "") + "</span></li>";
            }).join(""));
        })
        .catch(function (err) {
            $list.html('<li class="py-6 text-danger">Couldn\'t load registrations. ' + escapeHtml(err.message) + "</li>");
        });
}
