// same rules the backend checks: 8+ chars, upper and lower case, a number, a symbol
const PASSWORD_RULES = [
    { key: "length", label: "8+ characters", test: function (p) { return p.length >= 8; } },
    { key: "case", label: "Upper + lower case", test: function (p) { return /[a-z]/.test(p) && /[A-Z]/.test(p); } },
    { key: "number", label: "A number", test: function (p) { return /\d/.test(p); } },
    { key: "symbol", label: "A symbol", test: function (p) { return /[\W_]/.test(p); } },
];

const STRENGTH = [
    { label: "not set", bar: "", text: "text-canvas/60" },
    { label: "Weak", bar: "bg-[#FF8A80]", text: "text-[#FFB4AB]" },
    { label: "Fair", bar: "bg-sandstone", text: "text-sandstone" },
    { label: "Good", bar: "bg-jacaranda-light", text: "text-jacaranda-light" },
    { label: "Strong", bar: "bg-[#5DD6A2]", text: "text-[#7EE2B8]" },
];

$(function () {
    if (!guestOnly()) return;
    fillIcons();
    bindPasswordToggles();
    checkPassword("");

    $("#password").on("input", function () { checkPassword($(this).val()); });

    $("#signup-form").on("submit", function (e) {
        e.preventDefault();
        const $form = $(this);
        clearFieldErrors($form);
        $("#signup-banner").prop("hidden", true);

        const fullName = $("#full_name").val().trim();
        const email = $("#email").val().trim();
        const password = $("#password").val();
        const confirm = $("#confirm_password").val();

        let ok = true;
        if (fullName.length < 2) { setFieldError($("#full_name"), "Enter your full name."); ok = false; }
        if (!isValidEmail(email)) { setFieldError($("#email"), "Enter a valid email address."); ok = false; }
        if (checkPassword(password) < 4) { setFieldError($("#password"), "Your password needs to tick all four boxes below."); ok = false; }
        if (!confirm || confirm !== password) { setFieldError($("#confirm_password"), "Passwords don't match."); ok = false; }
        if (!ok) { $form.find("[aria-invalid]").first().trigger("focus"); return; }

        const $button = $("#signup-button");
        setLoading($button, true, "Creating account…");

        // never send a role, new accounts are always residents
        apiPost("/auth/signup", { full_name: fullName, email: email, password: password })
            .then(function () {
                flash("Account created! Log in to get started.", "success");
                window.location.href = "login.html";
            })
            .catch(function (err) {
                setLoading($button, false);
                if (err.status === 409) {
                    setFieldError($("#email"), "There's already an account with this email. Try logging in instead.");
                    $("#email").trigger("focus");
                } else {
                    $("#signup-banner").text(err.message).prop("hidden", false);
                }
            });
    });
});

// updates the meter + checklist and returns how many rules pass (0-4)
function checkPassword(password) {
    let score = 0;
    PASSWORD_RULES.forEach(function (rule) {
        const passed = rule.test(password);
        if (passed) score++;
        $('#password-rules [data-rule="' + rule.key + '"]')
            .toggleClass("text-[#7EE2B8]", passed)
            .html(icon(passed ? "check" : "x", "size-4") + '<span>' + rule.label + '</span><span class="sr-only">' + (passed ? " (done)" : " (missing)") + "</span>");
    });

    const level = password ? STRENGTH[score] || STRENGTH[1] : STRENGTH[0];
    const filled = password ? Math.max(score, 1) : 0;
    $(".strength-bar").each(function (i) {
        $(this).attr("class", "strength-bar h-1.5 rounded-full " + (i < filled ? level.bar : "bg-white/15"));
    });
    $("#strength-label").attr("class", "mt-2 text-sm font-semibold " + level.text).text("Strength: " + level.label);
    return score;
}
