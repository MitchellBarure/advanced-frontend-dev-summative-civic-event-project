// Shared UI bits: toasts, confirm modal, skeletons, empty/error states, dates, form errors.

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function initialsOf(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase();
}

function firstName(name) {
    return String(name || "").trim().split(/\s+/)[0];
}

// backend sends dates in UTC so I always show them in SA time
const SA_TIMEZONE = "Africa/Johannesburg";

function formatWith(iso, options) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: SA_TIMEZONE }, options)).format(new Date(iso));
}
function formatDay(iso) { return formatWith(iso, { weekday: "short", day: "numeric", month: "short" }); }          // Sat 29 Nov
function formatTime(iso) { return formatWith(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); }      // 10:00
function formatDateTime(iso) { return formatWith(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + ", " + formatTime(iso); }
function formatLongDate(date) { return formatWith(date, { weekday: "long", day: "numeric", month: "long" }); }      // Monday, 24 November

// counts calendar days, so something on next Monday morning is "in 7 days", not 8
function daysUntil(iso) {
    const target = new Date(iso);
    const now = new Date();
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((targetDay - today) / 86400000);
}

/* toasts: success = leaf, error = danger, info = sky */
const TOAST_STYLES = {
    success: { box: "border-leaf/30 bg-leaf-soft", text: "text-leaf", icon: "circle-check" },
    error: { box: "border-danger/30 bg-blush", text: "text-danger", icon: "circle-alert" },
    info: { box: "border-sky-text/30 bg-sky", text: "text-sky-text", icon: "info" },
};

function showToast(message, type) {
    const style = TOAST_STYLES[type] || TOAST_STYLES.info;
    let $region = $("#toast-region");
    if (!$region.length) {
        $region = $('<div id="toast-region" class="fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite"></div>');
        $("body").append($region);
    }
    const $toast = $(
        '<div role="' + (type === "error" ? "alert" : "status") + '" class="flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg ' + style.box + '">' +
            '<span class="' + style.text + '">' + icon(style.icon, "size-5 mt-0.5") + '</span>' +
            '<p class="flex-1 text-sm font-semibold text-ink"></p>' +
            '<button type="button" class="-m-1 rounded-full p-1 text-muted hover:text-ink" aria-label="Dismiss">' + icon("x", "size-4") + '</button>' +
        '</div>'
    );
    $toast.find("p").text(message);
    $toast.find("button").on("click", function () { $toast.remove(); });
    $region.append($toast);
    setTimeout(function () { $toast.fadeOut(200, function () { $toast.remove(); }); }, 5000);
}

// toast that shows up on the next page (e.g. "Account created" after redirecting to login)
function flash(message, type) {
    sessionStorage.setItem("jc_flash", JSON.stringify({ message: message, type: type }));
}
function showFlash() {
    const saved = sessionStorage.getItem("jc_flash");
    if (!saved) return;
    sessionStorage.removeItem("jc_flash");
    const f = JSON.parse(saved);
    showToast(f.message, f.type);
}

// confirm modal using the native <dialog>, which gives me Esc-to-close and a focus trap for free.
// returns a promise: true if they confirm
function confirmDialog(options) {
    return new Promise(function (resolve) {
        const $dialog = $(
            '<dialog class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-ink/60 backdrop:backdrop-blur-sm" aria-labelledby="confirm-title">' +
                '<div class="p-6">' +
                    '<div class="mb-4 grid size-12 place-items-center rounded-full ' + (options.danger ? "bg-blush text-danger" : "bg-jacaranda-mist text-jacaranda") + '">' + icon(options.danger ? "trash-2" : "info", "size-6") + '</div>' +
                    '<h2 id="confirm-title" class="text-lg font-bold text-ink"></h2>' +
                    '<p class="mt-2 text-muted"></p>' +
                    '<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
                        '<button type="button" class="btn-secondary" value="cancel">' + escapeHtml(options.cancelText || "Keep it") + '</button>' +
                        '<button type="button" class="' + (options.danger ? "btn-danger-solid" : "btn-primary") + '" value="ok">' + escapeHtml(options.confirmText || "Confirm") + '</button>' +
                    '</div>' +
                '</div>' +
            '</dialog>'
        );
        $dialog.find("h2").text(options.title);
        $dialog.find("p").text(options.message || "");
        $("body").append($dialog);

        const dialog = $dialog[0];
        let done = false;
        // finish straight from the button / Esc instead of waiting for the "close" event,
        // which some browsers fire late (or not at all when the tab is in the background)
        function finish(ok) {
            if (done) return;
            done = true;
            if (dialog.open) dialog.close();
            $dialog.remove();
            resolve(ok);
        }
        $dialog.find("button").on("click", function () { finish(this.value === "ok"); });
        $dialog.on("cancel", function (e) {
            e.preventDefault();
            finish(false);
        });
        $dialog.on("close", function () { finish(false); });
        dialog.showModal();
        $dialog.find('[value="cancel"]').trigger("focus");
    });
}

/* loading, empty and error states */
function skeletonCards(count) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html +=
            '<div class="card overflow-hidden" aria-hidden="true">' +
                '<div class="skeleton aspect-[16/9] rounded-none"></div>' +
                '<div class="space-y-3 p-5"><div class="skeleton h-5 w-24 rounded-full"></div><div class="skeleton h-6 w-3/4"></div><div class="skeleton h-4 w-1/2"></div><div class="skeleton h-11 w-full rounded-full"></div></div>' +
            '</div>';
    }
    return html;
}

function skeletonRows(count) {
    let html = "";
    for (let i = 0; i < count; i++) {
        html += '<div class="flex items-center gap-4 p-4" aria-hidden="true"><div class="skeleton size-14 rounded-xl"></div><div class="flex-1 space-y-2"><div class="skeleton h-5 w-1/2"></div><div class="skeleton h-4 w-1/3"></div></div></div>';
    }
    return html;
}

function emptyState(title, text, actionHtml) {
    return (
        '<div class="col-span-full rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">' +
            '<div class="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-jacaranda-mist"><img src="' + pageUrl("assets/logo.svg") + '" alt="" class="size-10"></div>' +
            '<h2 class="text-lg font-bold text-ink">' + escapeHtml(title) + '</h2>' +
            '<p class="mx-auto mt-1 max-w-md text-muted">' + escapeHtml(text) + '</p>' +
            (actionHtml ? '<div class="mt-5">' + actionHtml + '</div>' : "") +
        '</div>'
    );
}

// error box with a Retry button. the page passes the function to run again
function showError($container, message, retry) {
    $container.attr("aria-busy", "false").html(
        '<div class="col-span-full rounded-2xl border border-danger/20 bg-blush/40 px-6 py-12 text-center" role="alert">' +
            '<div class="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-blush text-danger">' + icon("circle-alert", "size-6") + '</div>' +
            '<p class="font-semibold text-ink"></p>' +
            '<button type="button" class="btn-secondary mt-4 retry-btn">' + icon("refresh-cw", "size-4") + 'Try again</button>' +
        '</div>'
    );
    $container.find("p").text(message);
    $container.find(".retry-btn").on("click", retry);
}

/* buttons and form fields */
function setLoading($btn, loading, text) {
    if (loading) {
        $btn.data("label", $btn.html());
        $btn.prop("disabled", true).attr("aria-busy", "true")
            .html(icon("loader-circle", "size-5 animate-spin") + escapeHtml(text || "Loading…"));
    } else {
        $btn.prop("disabled", false).removeAttr("aria-busy").html($btn.data("label"));
    }
}

// error text goes in a <p id="<input id>-error"> under the field
function setFieldError($input, message) {
    const id = $input.attr("id");
    const $error = $("#" + id + "-error");
    if (message) {
        $input.attr("aria-invalid", "true").attr("aria-describedby", id + "-error");
        $error.text(message).prop("hidden", false);
    } else {
        $input.removeAttr("aria-invalid");
        $error.text("").prop("hidden", true);
    }
}

function clearFieldErrors($form) {
    $form.find("[aria-invalid]").removeAttr("aria-invalid");
    $form.find("[id$='-error']").text("").prop("hidden", true);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// on/off switch (role="switch"), used for the users' Active toggle
function switchMarkup(on, attrs) {
    return '<button type="button" role="switch" aria-checked="' + on + '" ' + (attrs || "") +
        ' class="toggle-switch relative h-8 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ' + (on ? "bg-jacaranda" : "bg-ink/20") + '">' +
        '<span class="absolute top-1 size-6 rounded-full bg-white shadow transition-all ' + (on ? "left-7" : "left-1") + '"></span></button>';
}

function setSwitch($button, on) {
    $button.attr("aria-checked", String(on)).toggleClass("bg-jacaranda", on).toggleClass("bg-ink/20", !on);
    $button.find("span").toggleClass("left-7", on).toggleClass("left-1", !on);
}

// show / hide password buttons: <button class="toggle-password" data-target="#password">
function bindPasswordToggles() {
    $(".toggle-password").on("click", function () {
        const $input = $($(this).data("target"));
        const show = $input.attr("type") === "password";
        $input.attr("type", show ? "text" : "password");
        $(this).text(show ? "Hide" : "Show").attr("aria-pressed", String(show));
    });
}

// once someone starts fixing a field, take its error away
$(document).on("input change", "input[aria-invalid], textarea[aria-invalid], select[aria-invalid]", function () {
    setFieldError($(this), "");
});
