// Event bits used on more than one page (home, events list, event detail, admin).

function isPublished(event) {
    return event.published !== false;
}

function isPast(event) {
    return new Date(event.ends_at || event.starts_at) < new Date();
}

function byStartDate(a, b) {
    return new Date(a.starts_at) - new Date(b.starts_at);
}

function mapsUrl(location) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location + ", Pretoria");
}

// my registrations that are still active (cancelled ones stay in the table with status "cancelled")
function getMyRegistrations() {
    return apiGet("/event-registrations/my-registrations").then(function (res) {
        return (res.data || []).filter(function (r) { return r.status === "registered"; });
    });
}

// event photo, or a purple placeholder with the logo when there isn't one
function eventImage(event, classes) {
    const url = event.metadata && event.metadata.image_url;
    if (url) {
        return '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(event.title) + '" loading="lazy" class="' + classes + ' object-cover">';
    }
    return '<div class="' + classes + ' grid place-items-center bg-linear-to-br from-jacaranda to-jacaranda-deep" role="img" aria-label="' + escapeHtml(event.title) + '">' +
        '<img src="' + pageUrl("assets/logo-white.svg") + '" alt="" class="aspect-square w-1/5 max-w-32 min-w-8 opacity-85"></div>';
}

function registerButton(event, registered, fullWidth) {
    const width = fullWidth ? " w-full" : "";
    if (isPast(event)) {
        return '<span class="btn' + width + ' bg-ink/5 text-muted">Event ended</span>';
    }
    if (registered) {
        return '<a href="' + pageUrl("event.html?id=" + event.id) + '" class="btn-secondary' + width + '">Registered ' + icon("check", "size-4 text-leaf") + "</a>";
    }
    return '<button type="button" class="btn-primary register-button' + width + '" data-id="' + event.id + '" data-title="' + escapeHtml(event.title) + '">Register</button>';
}

// card for the events grid and the home page. options: { registered, compact }
function eventCard(event, options) {
    options = options || {};
    const viewUrl = pageUrl("event.html?id=" + event.id);
    return (
        '<article class="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">' +
            '<a href="' + viewUrl + '" tabindex="-1" aria-hidden="true">' + eventImage(event, "aspect-[16/9] w-full") + "</a>" +
            '<div class="flex flex-1 flex-col p-5">' +
                '<div class="flex items-center justify-between gap-2">' +
                    '<span class="chip bg-jacaranda-mist text-jacaranda-deep">' + icon("calendar", "size-3.5") + escapeHtml(formatDay(event.starts_at)) + "</span>" +
                    '<span class="flex items-center gap-1 text-sm font-semibold text-muted">' + icon("clock", "size-3.5") + escapeHtml(formatTime(event.starts_at)) + "</span>" +
                "</div>" +
                '<h3 class="mt-3 text-lg leading-snug font-bold"><a href="' + viewUrl + '" class="hover:text-jacaranda">' + escapeHtml(event.title) + "</a></h3>" +
                '<p class="eyebrow mt-1 flex items-center gap-1 text-muted">' + icon("map-pin", "size-3.5") + escapeHtml(event.location || "Pretoria") + "</p>" +
                (options.compact ? "" : '<p class="mt-3 line-clamp-2 text-sm text-muted">' + escapeHtml(event.description || "") + "</p>") +
                '<div class="mt-auto pt-5">' +
                    (options.compact
                        ? '<div data-role="user">' + registerButton(event, options.registered, true) + '</div><a data-role="admin" href="' + viewUrl + '" class="btn-secondary w-full">View event</a>'
                        : '<div class="flex gap-2"><a href="' + viewUrl + '" class="btn-secondary flex-1">View</a><div data-role="user" class="flex flex-1">' + registerButton(event, options.registered, true) + "</div></div>") +
                    // admin only: edit / delete on each card. residents never get these
                    (options.compact ? "" :
                    '<div data-role="admin" class="mt-3 flex items-center gap-2 border-t border-line pt-3">' +
                        '<a href="' + pageUrl("admin/event-form.html?id=" + event.id) + '" class="btn-ghost min-h-9 px-3">' + icon("pencil", "size-4") + "Edit</a>" +
                        '<button type="button" class="btn-ghost delete-event-button min-h-9 px-3 text-danger hover:bg-blush/60" data-id="' + event.id + '" data-title="' + escapeHtml(event.title) + '">' + icon("trash-2", "size-4") + "Delete</button>" +
                    "</div>") +
                "</div>" +
            "</div>" +
        "</article>"
    );
}

// register straight from a card. swaps the button for "Registered ✓" when it works
function bindRegisterButtons($root, onRegistered) {
    $root.on("click", ".register-button", function () {
        const $btn = $(this);
        const eventId = $btn.data("id");
        setLoading($btn, true, "Registering…");
        apiPost("/event-registrations/register", { event_id: eventId })
            .then(function () {
                showToast("You're registered for " + $btn.data("title") + ".", "success");
                $btn.replaceWith('<a href="' + pageUrl("event.html?id=" + eventId) + '" class="btn-secondary ' + ($btn.hasClass("w-full") ? "w-full" : "") + '">Registered ' + icon("check", "size-4 text-leaf") + "</a>");
                if (onRegistered) onRegistered(eventId);
            })
            .catch(function (err) {
                setLoading($btn, false);
                showToast(err.status === 409 ? "You're already registered for this event." : err.message, "error");
            });
    });
}

// admin only: every active registration with its event attached. there's no "all registrations"
// endpoint, so I ask for each event's attendees and put them together
function loadAllRegistrations() {
    return apiGet("/events").then(function (res) {
        const events = res.data || [];
        return Promise.all(events.map(function (e) {
            return apiGet("/event-registrations/event/" + e.id + "/attendees")
                .then(function (a) { return a.data || []; })
                .catch(function () { return []; });
        })).then(function (lists) {
            const registrations = [];
            lists.forEach(function (list, i) {
                list.filter(function (r) { return r.status === "registered"; }).forEach(function (r) {
                    registrations.push(Object.assign({}, r, { event: events[i] }));
                });
            });
            return { events: events, registrations: registrations };
        });
    });
}

// admin only: delete with a confirm modal first
function deleteEvent(id, title) {
    return confirmDialog({
        title: "Delete " + title + "?",
        message: "This can't be undone. Registrations and feedback for this event are removed too.",
        confirmText: "Delete event",
        cancelText: "Cancel",
        danger: true,
    }).then(function (ok) {
        if (!ok) return false;
        return apiDelete("/events/" + id).then(function () {
            showToast("Event deleted.", "success");
            return true;
        }).catch(function (err) {
            showToast(err.message, "error");
            return false;
        });
    });
}
