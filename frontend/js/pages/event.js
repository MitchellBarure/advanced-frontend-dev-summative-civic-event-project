const eventId = new URLSearchParams(location.search).get("id");
let currentEvent = null;

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    applyRoleVisibility(); // admin only cards vs resident feedback form
    fillIcons();
    showFlash();

    if (!eventId) {
        showNotFound();
        return;
    }
    loadEvent();

    $("#delete-button").on("click", function () {
        deleteEvent(currentEvent.id, currentEvent.title).then(function (deleted) {
            if (deleted) {
                flash("Event deleted.", "success");
                window.location.href = "events.html";
            }
        });
    });
    $("#show-all-registrants").on("click", function () {
        $("#registrants li").prop("hidden", false);
        $(this).prop("hidden", true);
    });
});

function loadEvent() {
    $("#event-loading").prop("hidden", false);
    $("#event-error").prop("hidden", true);

    apiGet("/events/" + eventId)
        .then(function (res) {
            currentEvent = res.data;
            // drafts are admin only. a resident with a draft link gets "not found"
            if (!isPublished(currentEvent) && !isAdmin()) {
                showNotFound();
                return;
            }
            renderEvent(currentEvent);
            loadRegistration();
            loadFeedback();
            if (isAdmin()) loadRegistrants();
        })
        .catch(function (err) {
            if (err.status === 404) { showNotFound(); return; }
            $("#event-loading").prop("hidden", true);
            showError($("#event-error").prop("hidden", false), "Couldn't load this event. " + err.message, loadEvent);
        });
}

function showNotFound() {
    $("#event-loading").prop("hidden", true);
    $("#crumb-title").text("Not found");
    $("#event-error").prop("hidden", false).html(emptyState(
        "We couldn't find that event",
        "It may have been removed or the link is wrong.",
        '<a href="events.html" class="btn-primary">Back to events</a>'
    ));
}

function renderEvent(e) {
    document.title = e.title + " · Jacaranda City";
    $("#crumb-title").text(e.title);
    $("#event-image").html(eventImage(e, "aspect-[16/9] w-full sm:aspect-[21/9]"));
    $("#event-title").text(e.title);
    $("#event-starts").text(formatDateTime(e.starts_at));
    $("#event-ends").text(e.ends_at ? formatDateTime(e.ends_at) : "Not set");
    $("#event-location").text(e.location || "Pretoria");
    $("#event-map").attr("href", mapsUrl(e.location || "Pretoria"));
    $("#event-description").text(e.description || "No description yet.");
    $("#edit-link").attr("href", "admin/event-form.html?id=" + e.id);

    let chips = "";
    const now = new Date();
    if (isPast(e)) chips += '<span class="chip bg-ink/5 text-muted">Ended</span>';
    else if (new Date(e.starts_at) <= now) chips += '<span class="chip bg-leaf-soft text-leaf">Happening now</span>';
    else chips += '<span class="chip bg-jacaranda-mist text-jacaranda-deep">Upcoming · ' + escapeHtml(formatDay(e.starts_at)) + "</span>";
    if (!isPublished(e)) chips += '<span class="chip bg-sandstone-soft text-ink">Draft, only admins can see this</span>';
    $("#event-chips").html(chips);

    $("#event-loading").prop("hidden", true);
    $("#event-content").prop("hidden", false);
}

/* registration card */
function loadRegistration() {
    if (isAdmin()) {
        renderRegisterCard(false);
        return;
    }
    getMyRegistrations()
        .then(function (list) {
            const registered = list.some(function (r) { return r.event_id === eventId; });
            renderRegisterCard(registered);
        })
        .catch(function () { renderRegisterCard(false); });
}

function renderRegisterCard(registered, goingCount) {
    const e = currentEvent;
    let html = '<p class="eyebrow text-muted">Free event' + (goingCount != null ? " · " + goingCount + " going" : "") + "</p>";

    if (isAdmin()) {
        // admins manage events, residents register for them
        html += '<p class="mt-3 text-muted">Residents register from this card. You can see who signed up below.</p>';
    } else if (isPast(e)) {
        html += '<p class="mt-3 font-semibold">This event has ended.</p>' +
            (registered ? '<p class="mt-1 text-sm text-muted">Thanks for coming! Leave some feedback below.</p>' : "");
    } else if (registered) {
        html += '<p class="chip mt-3 bg-leaf-soft text-leaf">' + icon("circle-check", "size-4") + "You're going</p>" +
            '<button id="cancel-button" type="button" class="btn-danger mt-4 w-full">Cancel registration</button>';
    } else {
        html += '<button id="register-button" type="button" class="btn-primary mt-4 w-full min-h-12 text-base">Register for this event</button>' +
            '<p class="mt-2 text-center text-xs text-muted">You can cancel any time before it starts.</p>';
    }
    $("#register-card").html(html);

    $("#register-button").on("click", function () {
        const $btn = $(this);
        setLoading($btn, true, "Registering…");
        apiPost("/event-registrations/register", { event_id: eventId })
            .then(function () {
                showToast("You're registered! See you there.", "success");
                renderRegisterCard(true);
            })
            .catch(function (err) {
                if (err.status === 409) { renderRegisterCard(true); return; }
                setLoading($btn, false);
                showToast(err.message, "error");
            });
    });

    $("#cancel-button").on("click", function () {
        confirmDialog({
            title: "Cancel your spot at " + e.title + "?",
            message: "You can register again later if there's still space.",
            confirmText: "Cancel registration",
            cancelText: "Keep my spot",
            danger: true,
        }).then(function (ok) {
            if (!ok) return;
            const $btn = $("#cancel-button");
            setLoading($btn, true, "Cancelling…");
            apiPost("/event-registrations/cancel", { event_id: eventId })
                .then(function () {
                    showToast("Registration cancelled.", "success");
                    renderRegisterCard(false);
                })
                .catch(function (err) {
                    setLoading($btn, false);
                    showToast(err.message, "error");
                });
        });
    });
}

/* admin only: registrants list (GET is admin-only on the backend too) */
function loadRegistrants() {
    $("#registrants").html('<li class="py-2"><div class="skeleton h-5 w-full"></div></li>');
    apiGet("/event-registrations/event/" + eventId + "/attendees")
        .then(function (res) {
            const people = res.data || [];
            $("#registrants-title").text("Registrants (" + people.length + ")");
            renderRegisterCard(false, people.length);
            if (!people.length) {
                $("#registrants").html('<li class="py-2 text-sm text-muted">No one has registered yet.</li>');
                return;
            }
            $("#registrants").html(people.map(function (p, i) {
                return '<li class="flex items-center justify-between gap-3 py-2.5"' + (i >= 5 ? " hidden" : "") + ">" +
                    '<span class="truncate font-medium">' + escapeHtml(p.full_name) + "</span>" +
                    '<a href="mailto:' + escapeHtml(p.email) + '" class="truncate text-xs font-semibold tracking-wide text-muted uppercase hover:text-jacaranda">' + escapeHtml(p.email) + "</a></li>";
            }).join(""));
            $("#show-all-registrants").prop("hidden", people.length <= 5);
        })
        .catch(function (err) {
            $("#registrants").html('<li class="py-2 text-sm text-danger">' + escapeHtml(err.message) + "</li>");
        });
}

/* feedback */
function loadFeedback() {
    $("#rating-summary").html('<div class="skeleton h-14 w-full"></div>');
    $("#feedback-list").empty();

    Promise.all([
        apiGet("/event-feedback/event/" + eventId),
        isAdmin() ? Promise.resolve({ data: [] }) : apiGet("/event-feedback/my-feedback"),
    ])
        .then(function (results) {
            const feedback = results[0].data || [];
            const mine = (results[1].data || []).find(function (f) { return f.event_id === eventId; });
            renderRatingSummary(feedback);
            renderFeedbackList(feedback);
            renderFeedbackForm(mine);
        })
        .catch(function (err) {
            showError($("#rating-summary"), "Couldn't load feedback. " + err.message, loadFeedback);
        });
}

function stars(rating, size) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += icon("star", (size || "size-4") + (i <= Math.round(rating) ? " *:fill-sandstone text-sandstone" : " text-ink/20"));
    }
    return '<span class="flex items-center gap-0.5" aria-hidden="true">' + html + "</span>";
}

function renderRatingSummary(feedback) {
    if (!feedback.length) {
        $("#rating-summary").html(
            '<span class="text-5xl font-extrabold text-ink/20">–</span>' +
            '<div>' + stars(0, "size-5") + '<p class="eyebrow mt-1 text-muted">No reviews yet</p></div>'
        );
        return;
    }
    const total = feedback.reduce(function (sum, f) { return sum + Number(f.rating); }, 0);
    const average = total / feedback.length;
    $("#rating-summary").html(
        '<span class="text-5xl font-extrabold">' + average.toFixed(1) + "</span>" +
        "<div>" + stars(average, "size-5") +
        '<p class="eyebrow mt-1 text-muted">From ' + feedback.length + (feedback.length === 1 ? " review" : " reviews") + "</p>" +
        '<span class="sr-only">Average rating ' + average.toFixed(1) + " out of 5</span></div>"
    );
}

function renderFeedbackList(feedback) {
    $("#feedback-list").html(feedback.map(function (f) {
        return '<article class="card p-5">' +
            '<div class="flex items-start justify-between gap-3">' +
                '<div class="flex items-center gap-3">' +
                    '<span class="grid size-9 place-items-center rounded-full bg-jacaranda-mist text-sm font-bold text-jacaranda-deep" aria-hidden="true">' + escapeHtml(initialsOf(f.full_name)) + "</span>" +
                    '<div><h3 class="font-bold">' + escapeHtml(f.full_name) + '</h3><p class="text-xs text-muted">' + escapeHtml(formatDay(f.created_at)) + "</p></div>" +
                "</div>" +
                stars(f.rating) + '<span class="sr-only">' + f.rating + " out of 5</span>" +
            "</div>" +
            (f.comment ? '<p class="mt-3 text-ink/85">' + escapeHtml(f.comment) + "</p>" : "") +
        "</article>";
    }).join(""));
}

// one feedback per resident per event (the backend enforces it too with a unique key)
function renderFeedbackForm(mine) {
    const $wrap = $("#feedback-form-wrap");
    if (!$wrap.length) return;

    if (mine) {
        $wrap.html(
            '<div class="card flex items-center gap-4 border-leaf/30 bg-leaf-soft p-5">' +
                '<span class="text-leaf">' + icon("circle-check", "size-6") + "</span>" +
                '<p class="font-semibold">You rated this ' + mine.rating + ' <span aria-hidden="true">★</span><span class="sr-only">out of 5</span>. Thanks for the feedback!</p>' +
            "</div>"
        );
        return;
    }

    let starInputs = "";
    for (let i = 1; i <= 5; i++) {
        starInputs +=
            '<label class="star-label cursor-pointer rounded-full p-1 text-ink/25 hover:text-sandstone" data-value="' + i + '">' +
                '<input type="radio" name="rating" value="' + i + '" class="sr-only">' +
                icon("star", "size-8") + '<span class="sr-only">' + i + (i === 1 ? " star" : " stars") + "</span>" +
            "</label>";
    }

    $wrap.html(
        '<form id="feedback-form" class="card p-6" novalidate>' +
            '<h3 class="text-lg font-bold">Add your feedback</h3>' +
            '<fieldset class="mt-4"><legend class="eyebrow text-muted">Rating</legend>' +
                '<div id="rating" class="mt-2 flex gap-1">' + starInputs + "</div>" +
                '<p id="rating-error" class="field-error" hidden></p>' +
            "</fieldset>" +
            '<label for="comment" class="eyebrow mt-5 block text-muted">Comment</label>' +
            '<textarea id="comment" rows="3" maxlength="1000" placeholder="How was it?" class="input mt-2"></textarea>' +
            '<button id="feedback-button" type="submit" class="btn-primary mt-5">Submit feedback</button>' +
        "</form>"
    );

    // colour the stars up to the chosen one
    $("#rating input").on("change", function () {
        const value = Number($(this).val());
        $("#rating .star-label").each(function () {
            const on = Number($(this).data("value")) <= value;
            $(this).toggleClass("text-sandstone", on).toggleClass("text-ink/25", !on)
                .find("svg").toggleClass("*:fill-sandstone", on);
        });
        setFieldError($("#rating"), "");
    });
    $("#rating input").on("focus", function () { $(this).parent().addClass("ring-2 ring-jacaranda"); })
        .on("blur", function () { $(this).parent().removeClass("ring-2 ring-jacaranda"); });

    $("#feedback-form").on("submit", function (ev) {
        ev.preventDefault();
        const rating = Number($("#rating input:checked").val());
        if (!rating) {
            setFieldError($("#rating"), "Pick a rating from 1 to 5 stars.");
            $("#rating input").first().trigger("focus");
            return;
        }
        const $btn = $("#feedback-button");
        setLoading($btn, true, "Sending…");
        apiPost("/event-feedback", { event_id: eventId, rating: rating, comment: $("#comment").val().trim() })
            .then(function () {
                showToast("Thanks for your feedback!", "success");
                loadFeedback();
            })
            .catch(function (err) {
                setLoading($btn, false);
                // 409 from the unique (user, event) key = already left feedback
                showToast(err.status === 409 ? "You've already left feedback for this event." : err.message, "error");
                if (err.status === 409) loadFeedback();
            });
    });
}
