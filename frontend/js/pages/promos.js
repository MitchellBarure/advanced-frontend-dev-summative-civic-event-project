let promos = [];

$(function () {
    if (!requireLogin()) return;
    renderNavbar();
    renderFooter();
    fillIcons();
    applyRoleVisibility();
    showFlash();

    const $list = $("#promo-list");
    $list.on("click", ".publish-button", function () { togglePublish($(this).data("id")); });
    $list.on("click", ".delete-button", function () { removePromo($(this).data("id")); });

    loadPromos();
});

function loadPromos() {
    $("#promo-list").attr("aria-busy", "true").html(
        '<div class="skeleton aspect-[21/9] rounded-3xl"></div>' +
        '<div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">' + skeletonCards(3) + "</div>"
    );

    getPromos()
        .then(function (list) {
            // residents only get published promos. admins see drafts too so they can manage them
            promos = list
                .filter(function (p) { return isAdmin() || isLive(p); })
                .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
            renderPromos();
        })
        .catch(function (err) {
            showError($("#promo-list"), "Couldn't load promos. " + err.message, loadPromos);
        });
}

function renderPromos() {
    const $list = $("#promo-list").attr("aria-busy", "false");
    if (!promos.length) {
        $list.html(emptyState("No promos yet", "Videos about what's happening in Pretoria will show up here.",
            isAdmin() ? '<a href="admin/promo-form.html" class="btn-primary">' + icon("plus", "size-4") + "New promo</a>" : ""));
        return;
    }

    const rest = promos.slice(1);
    $list.html(
        featuredPromo(promos[0]) +
        (rest.length
            ? '<section class="mt-16" aria-labelledby="more-promos-title">' +
                '<div class="flex items-end justify-between gap-4 border-b border-line pb-4"><h2 id="more-promos-title" class="text-3xl tracking-tight">More promos</h2>' +
                '<p class="text-sm text-muted">' + rest.length + (rest.length === 1 ? " video" : " videos") + "</p></div>" +
                '<div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">' + rest.map(promoCard).join("") + "</div></section>"
            : "")
    );
    applyRoleVisibility($list);
    fillVideoDurations($list);
}

function featuredPromo(p) {
    const url = "promo.html?id=" + p.id;
    return (
        '<article class="card grid overflow-hidden lg:grid-cols-[3fr_2fr]">' +
            '<a href="' + url + '" class="group block" aria-label="Watch ' + escapeHtml(p.title) + '">' + videoThumb(p, true) + "</a>" +
            '<div class="flex flex-col justify-center p-6 sm:p-8">' +
                '<div class="flex flex-wrap items-center gap-2"><p class="eyebrow text-jacaranda-deep">Featured</p>' + (isLive(p) ? "" : '<span data-role="admin">' + statusChip(p) + "</span>") + "</div>" +
                '<h2 class="mt-2 text-2xl font-bold text-balance sm:text-3xl"><a href="' + url + '" class="hover:text-jacaranda">' + escapeHtml(p.title) + "</a></h2>" +
                '<p class="mt-3 line-clamp-3 text-muted">' + escapeHtml(p.description || "") + "</p>" +
                '<div><a href="' + url + '" class="btn-primary mt-6">' + icon("play", "*:fill-current size-4") + "Watch now</a></div>" +
                '<div class="mt-6 empty:hidden">' + adminActions(p) + "</div>" +
            "</div>" +
        "</article>"
    );
}

function promoCard(p) {
    const url = "promo.html?id=" + p.id;
    return (
        '<article class="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">' +
            '<a href="' + url + '" class="group block" tabindex="-1" aria-hidden="true">' + videoThumb(p, false) + "</a>" +
            '<div class="flex flex-1 flex-col p-5">' +
                (isLive(p) ? "" : '<div data-role="admin" class="mb-2">' + statusChip(p) + "</div>") +
                '<h2 class="text-lg font-bold"><a href="' + url + '" class="hover:text-jacaranda">' + escapeHtml(p.title) + "</a></h2>" +
                '<p class="mt-1 line-clamp-2 text-sm text-muted">' + escapeHtml(p.description || "") + "</p>" +
                '<div class="mt-auto pt-4">' + adminActions(p) + "</div>" +
            "</div>" +
        "</article>"
    );
}

// admin only: edit / publish toggle / delete on each promo. residents never get these
function adminActions(p) {
    return (
        '<div data-role="admin" class="flex flex-wrap items-center gap-1 border-t border-line pt-3">' +
            '<a href="admin/promo-form.html?id=' + p.id + '" class="btn-ghost min-h-9 px-3">' + icon("pencil", "size-4") + "Edit</a>" +
            '<button type="button" class="publish-button btn-ghost min-h-9 px-3" data-id="' + p.id + '">' + icon(isLive(p) ? "eye-off" : "eye", "size-4") + (isLive(p) ? "Unpublish" : "Publish") + "</button>" +
            '<button type="button" class="delete-button btn-ghost min-h-9 px-3 text-danger hover:bg-blush/60" data-id="' + p.id + '">' + icon("trash-2", "size-4") + "Delete</button>" +
        "</div>"
    );
}

function findPromo(id) {
    return promos.find(function (p) { return p.id === id; });
}

// admin only (button is only rendered for admins)
function togglePublish(id) {
    const p = findPromo(id);
    setPublishState("promos", p, !isLive(p))
        .then(function (updated) {
            Object.assign(p, updated);
            renderPromos();
        })
        .catch(function (err) { showToast(err.message, "error"); });
}

// admin only
function removePromo(id) {
    deleteMedia("promos", findPromo(id)).then(function (deleted) {
        if (!deleted) return;
        promos = promos.filter(function (p) { return p.id !== id; });
        renderPromos();
    });
}
