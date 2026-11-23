// change this if the backend runs somewhere else
const API_BASE_URL = "http://localhost:4000";
const API_URL = API_BASE_URL + "/api";
const APP_NAME = "Jacaranda City";

// admin pages sit one folder down, so their links need "../" in front
const ROOT = location.pathname.includes("/admin/") ? "../" : "";

function pageUrl(path) {
    return ROOT + path;
}
