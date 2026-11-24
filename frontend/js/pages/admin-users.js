let users = [];

$(function () {
    // admin only page: list accounts and turn them on/off. no role editing anywhere
    if (!requireAdmin()) return;
    renderAdminSidebar("users");
    fillIcons();
    showFlash();

    $("#search").on("input", renderUsers);
    $("#user-rows").on("click", ".toggle-switch", function () { toggleUser($(this)); });

    loadUsers();
});

function loadUsers() {
    $("#user-rows").attr("aria-busy", "true").html('<tr><td colspan="5">' + skeletonRows(4) + "</td></tr>");
    apiGet("/users", { limit: 100 })
        .then(function (res) {
            users = res.data || [];
            renderUsers();
        })
        .catch(function (err) {
            $("#user-rows").html('<tr><td colspan="5" class="p-4"><div id="users-error"></div></td></tr>');
            showError($("#users-error"), "Couldn't load users. " + err.message, loadUsers);
        });
}

function renderUsers() {
    const q = $("#search").val().trim().toLowerCase();
    const me = getUser();
    const rows = users.filter(function (u) {
        return !q || (u.full_name + " " + u.email).toLowerCase().indexOf(q) !== -1;
    });
    $("#showing").text("Showing " + rows.length + " of " + users.length);

    const $body = $("#user-rows").attr("aria-busy", "false");
    if (!rows.length) {
        $body.html('<tr><td colspan="5" class="px-5 py-12 text-center text-muted">' + (users.length ? "No one matches that search." : "No users yet.") + "</td></tr>");
        return;
    }

    $body.html(rows.map(function (u) {
        const isMe = u.id === me.id;
        return "<tr>" +
            '<td class="px-5 py-3"><div class="flex items-center gap-3">' + avatar(u.full_name) +
                '<div class="min-w-0"><p class="truncate font-semibold">' + escapeHtml(u.full_name) + (isMe ? ' <span class="text-sm font-normal text-muted">(you)</span>' : "") + "</p>" +
                '<p class="truncate text-sm text-muted">' + escapeHtml(u.email) + "</p></div></div></td>" +
            '<td class="px-5 py-3">' + roleChip(u.role) + "</td>" +
            '<td class="px-5 py-3 status-cell">' + accountChip(u.is_active) + "</td>" +
            // admins can't switch themselves off (they'd lock themselves out)
            '<td class="px-5 py-3">' + switchMarkup(u.is_active, 'data-id="' + u.id + '" aria-label="Account active: ' + escapeHtml(u.full_name) + '"' + (isMe ? " disabled title=\"You can't turn off your own account\"" : "")) + "</td>" +
            '<td class="px-5 py-3 text-right"><a href="user.html?id=' + u.id + '" class="font-semibold text-jacaranda-deep underline underline-offset-4 hover:text-jacaranda">View<span class="sr-only"> ' + escapeHtml(u.full_name) + "</span></a></td>" +
        "</tr>";
    }).join(""));
}

function toggleUser($switch) {
    const user = users.find(function (u) { return u.id === $switch.data("id"); });
    setAccountActive(user, !user.is_active, function () {
        renderUsers();
        $("#user-rows .toggle-switch[data-id='" + user.id + "']").trigger("focus");
    });
}
