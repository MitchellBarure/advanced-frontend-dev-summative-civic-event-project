// Account bits shared by My profile, Admin → Users and the user detail page.

function roleChip(role) {
    return '<span class="chip bg-jacaranda-mist text-jacaranda-deep capitalize">' + escapeHtml(role) + "</span>";
}

function accountChip(active) {
    return active
        ? '<span class="chip bg-leaf-soft text-leaf">' + icon("circle-check", "size-3.5") + "Active</span>"
        : '<span class="chip bg-blush text-danger">' + icon("circle-x", "size-3.5") + "Disabled</span>";
}

function avatar(name, size) {
    const sizes = { sm: "size-10 text-sm", lg: "size-20 text-2xl sm:size-24 sm:text-3xl" };
    return '<span class="grid shrink-0 place-items-center rounded-full bg-jacaranda-mist font-bold text-jacaranda-deep ' + (sizes[size] || sizes.sm) + '" aria-hidden="true">' +
        escapeHtml(initialsOf(name)) + "</span>";
}

// admin only: turn an account on or off. turning off asks first.
// optimistic: the switch flips straight away (redraw), and flips back if the server says no
function setAccountActive(user, active, redraw) {
    const ask = active ? Promise.resolve(true) : confirmDialog({
        title: "Turn off " + user.full_name + "'s account?",
        message: "Their account is marked as disabled and they're stopped at login. You can turn it back on any time.",
        confirmText: "Turn off",
        cancelText: "Keep it on",
        danger: true,
    });
    return ask.then(function (ok) {
        if (!ok) return;
        user.is_active = active;
        redraw();
        return apiPatch("/users/" + user.id + (active ? "/enable" : "/disable"))
            .then(function () {
                showToast(active ? "Account enabled." : "Account disabled.", "success");
            })
            .catch(function (err) {
                user.is_active = !active;
                redraw();
                showToast("Couldn't change " + user.full_name + "'s account. " + err.message, "error");
            });
    });
}
