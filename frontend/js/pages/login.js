$(function () {
    if (!guestOnly()) return;
    fillIcons();
    bindPasswordToggles();
    showFlash();

    const params = new URLSearchParams(location.search);
    const banners = {
        expired: { text: "Your session has expired. Please log in again.", style: "border-sandstone/40 bg-sandstone/10 text-sandstone" },
        "login-required": { text: "Please log in to continue.", style: "border-jacaranda-light/40 bg-jacaranda/15 text-jacaranda-light" },
        "signed-out": { text: "You've been logged out. See you soon!", style: "border-white/15 bg-white/5 text-canvas" },
    };
    const banner = banners[params.get("reason")];
    if (banner) showBanner(banner.text, banner.style);

    $("#login-form").on("submit", function (e) {
        e.preventDefault();
        const $form = $(this);
        clearFieldErrors($form);
        $("#login-banner").prop("hidden", true);

        const email = $("#email").val().trim();
        const password = $("#password").val();
        let ok = true;
        if (!isValidEmail(email)) { setFieldError($("#email"), "Enter a valid email address."); ok = false; }
        if (!password) { setFieldError($("#password"), "Enter your password."); ok = false; }
        if (!ok) { $form.find("[aria-invalid]").first().trigger("focus"); return; }

        const $button = $("#login-button");
        setLoading($button, true, "Logging in…");

        apiPost("/auth/login", { email: email, password: password })
            .then(function (res) {
                const user = res.data.user;
                saveSession(res.data.token, { id: user.id, full_name: user.full_name, email: user.email, role: user.role }, $("#remember").is(":checked"));
                // the backend lets disabled accounts log in, so I check the status myself and stop them here
                return apiGet("/users/profile/me").then(function (me) {
                    if (me.data && me.data.is_active === false) {
                        clearSession();
                        setLoading($button, false);
                        showBanner("This account has been disabled. Contact the city if you think this is a mistake.", "border-[#FF8A80]/40 bg-danger/15 text-[#FFB4AB]");
                        return;
                    }
                    flash("Welcome back, " + firstName(user.full_name) + "!", "success");

                    // only follow our own page links, so ?next= can't send people to another site
                    const next = params.get("next");
                    window.location.href = next && /^(admin\/)?[\w-]+\.html/.test(next) ? next : homeUrl();
                });
            })
            .catch(function (err) {
                setLoading($button, false);
                const message = err.status === 401 ? "That email and password don't match. Try again." : err.message;
                showBanner(message, "border-[#FF8A80]/40 bg-danger/15 text-[#FFB4AB]");
            });
    });
});

function showBanner(text, style) {
    $("#login-banner").attr("class", "mt-6 flex items-start gap-3 rounded-xl border p-3 text-sm font-semibold " + style)
        .html(icon("info", "size-5 shrink-0") + "<span></span>").prop("hidden", false)
        .find("span").text(text);
}
