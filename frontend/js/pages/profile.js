let profile = null;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();

    $("#profile-form").on("submit", saveProfile);
    $("#cancel-button").on("click", function () {
        fillForm();
        showToast("Changes undone.", "info");
    });

    loadProfile();
});

function loadProfile() {
    $("#profile-loading").prop("hidden", false);
    $("#profile-error").prop("hidden", true);
    apiGet("/users/profile/me")
        .then(function (res) {
            profile = res.data;
            renderHeader();
            fillForm();
            $("#profile-loading").prop("hidden", true);
            $("#profile-form").prop("hidden", false);
        })
        .catch(function (err) {
            $("#profile-loading").prop("hidden", true);
            showError($("#profile-error").prop("hidden", false), "Couldn't load your profile. " + err.message, loadProfile);
        });
}

function renderHeader() {
    $("#profile-avatar").html(avatar(profile.full_name, "lg"));
    $("#profile-name").text(profile.full_name);
    $("#profile-chips").html(roleChip(profile.role) + accountChip(profile.is_active));
    $("#profile-role").text(profile.role);
    $("#profile-status").text(profile.is_active ? "Active" : "Disabled");
}

function fillForm() {
    clearFieldErrors($("#profile-form"));
    $("#form-banner").prop("hidden", true);
    $("#full_name").val(profile.full_name);
    $("#email").val(profile.email);
}

function saveProfile(e) {
    e.preventDefault();
    clearFieldErrors($("#profile-form"));
    $("#form-banner").prop("hidden", true);

    const fullName = $("#full_name").val().trim();
    const email = $("#email").val().trim();
    let ok = true;
    if (fullName.length < 2) { setFieldError($("#full_name"), "Enter your full name."); ok = false; }
    if (!isValidEmail(email)) { setFieldError($("#email"), "Enter a valid email address."); ok = false; }
    if (!ok) { $("#profile-form [aria-invalid]").first().trigger("focus"); return; }

    // only send what changed. role and status are never sent (the backend refuses them anyway)
    const changes = {};
    if (fullName !== profile.full_name) changes.full_name = fullName;
    if (email !== profile.email) changes.email = email;
    if (!Object.keys(changes).length) {
        showToast("Nothing to save, that's already your info.", "info");
        return;
    }

    const $button = $("#save-button");
    setLoading($button, true, "Saving…");
    apiPatch("/users/profile/me", changes)
        .then(function (res) {
            profile = Object.assign({}, profile, res.data || changes);
            updateStoredUser({ full_name: profile.full_name, email: profile.email });
            renderNavbar(); // so the initials and menu show the new name straight away
            renderHeader();
            setLoading($button, false);
            showToast("Profile saved.", "success");
        })
        .catch(function (err) {
            setLoading($button, false);
            if (err.status === 409) {
                setFieldError($("#email"), "That email is already used by another account.");
                $("#email").trigger("focus");
                return;
            }
            $("#form-banner").text(err.message).prop("hidden", false);
        });
}
