$(function () {
    // logged-in people skip the landing page and go straight to their home
    if (!guestOnly()) return;
    fillIcons();
    renderFooter();
    $("#footer footer").removeClass("mt-20"); // the purple city strip sits right on top of the footer here
    showFlash();
});
