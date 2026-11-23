// One helper for every backend call. Adds the Bearer token, sends JSON (or FormData for
// uploads) and turns errors into { status, message } so pages can show something friendly.

function friendlyError(xhr) {
    const body = xhr.responseJSON || {};
    let message = body.message;

    if (xhr.status === 0) message = "Can't reach the server. Check your connection and try again.";
    else if (xhr.status === 403) message = "You don't have access to that. Contact a city admin if you think this is wrong.";
    else if (xhr.status === 404) message = message || "We couldn't find that.";
    else if (xhr.status >= 500) message = "Something went wrong on our side. Please try again.";
    else if (!message) message = "Request failed (" + xhr.status + ").";

    // express-validator sends a list of field errors
    if (Array.isArray(body.errors) && body.errors.length) {
        message = body.errors.map(function (e) { return e.message; }).join(" ");
    }
    return { status: xhr.status, message: message };
}

function api(method, path, data, options) {
    options = options || {};
    const token = getToken();
    const isForm = data instanceof FormData;

    const settings = {
        url: API_URL + path,
        method: method,
        dataType: "json",
        headers: token ? { Authorization: "Bearer " + token } : {},
    };

    if (method === "GET") {
        settings.data = data;
    } else if (isForm) {
        settings.data = data;
        settings.processData = false;
        settings.contentType = false; // browser adds the multipart boundary
    } else if (data !== undefined) {
        settings.data = JSON.stringify(data);
        settings.contentType = "application/json";
    }

    // upload progress for images / audio / video
    if (options.onProgress) {
        settings.xhr = function () {
            const xhr = $.ajaxSettings.xhr();
            xhr.upload.addEventListener("progress", function (e) {
                if (e.lengthComputable) options.onProgress(Math.round((e.loaded / e.total) * 100));
            });
            return xhr;
        };
    }

    return new Promise(function (resolve, reject) {
        $.ajax(settings)
            .done(function (res) { resolve(res || {}); })
            .fail(function (xhr) {
                const err = friendlyError(xhr);
                // expired or bad token → sign out (but not on the login form itself)
                if (err.status === 401 && path.indexOf("/auth/") !== 0) {
                    logout("expired");
                    return;
                }
                if (err.status === 403) showToast(err.message, "error");
                reject(err);
            });
    });
}

function apiGet(path, params) { return api("GET", path, params); }
function apiPost(path, body, options) { return api("POST", path, body, options); }
function apiPut(path, body, options) { return api("PUT", path, body, options); }
function apiPatch(path, body) { return api("PATCH", path, body); }
function apiDelete(path) { return api("DELETE", path); }
