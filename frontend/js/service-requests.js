// Service requests. The backend has no route for these (only the list of types in
// backend/src/utils/serviceTypes.js), so they're saved in this browser's localStorage.
// That means admins only see requests made on the same browser. Fine for the demo.

const SERVICE_KEY = "jc_service_requests";

// same 6 types as the backend, each with a Lucide icon
const SERVICE_TYPES = [
    { value: "Road Repair", label: "Pothole / road damage", icon: "construction" },
    { value: "Street Light Issue", label: "Streetlight out", icon: "lamp" },
    { value: "Water Supply Issue", label: "Water leak or no water", icon: "droplets" },
    { value: "Sanitation", label: "Waste / sanitation", icon: "trash" },
    { value: "Public Event Support", label: "Help with a public event", icon: "party-popper" },
    { value: "General Complaint", label: "Something else", icon: "message-square-warning" },
];

const SERVICE_STATUSES = [
    { value: "submitted", label: "Submitted", chip: "bg-jacaranda-mist text-jacaranda-deep" },
    { value: "in_progress", label: "In progress", chip: "bg-sky text-sky-text" },
    { value: "resolved", label: "Resolved", chip: "bg-leaf-soft text-leaf" },
];

function serviceType(value) {
    return SERVICE_TYPES.find(function (t) { return t.value === value; }) || SERVICE_TYPES[SERVICE_TYPES.length - 1];
}

function serviceStatus(value) {
    return SERVICE_STATUSES.find(function (s) { return s.value === value; }) || SERVICE_STATUSES[0];
}

function requestStatusChip(value) {
    const s = serviceStatus(value);
    return '<span class="chip ' + s.chip + '">' + escapeHtml(s.label) + "</span>";
}

function readRequests() {
    try { return JSON.parse(localStorage.getItem(SERVICE_KEY) || "[]"); } catch (e) { return []; }
}

function saveRequests(list) {
    localStorage.setItem(SERVICE_KEY, JSON.stringify(list));
}

// newest first
function allRequests() {
    return readRequests().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
}

function myRequests() {
    const me = getUser();
    return allRequests().filter(function (r) { return r.user_id === me.id; });
}

// SR-1001, SR-1002… one higher than the last one saved
function nextRef(list) {
    const highest = list.reduce(function (max, r) { return Math.max(max, Number(r.ref.replace("SR-", "")) || 0); }, 1000);
    return "SR-" + (highest + 1);
}

function addRequest(data) {
    const list = readRequests();
    const me = getUser();
    const now = new Date().toISOString();
    const request = Object.assign({
        id: String(Date.now()),
        ref: nextRef(list),
        user_id: me.id,
        user_name: me.full_name,
        status: "submitted",
        created_at: now,
        updated_at: now,
    }, data);
    list.push(request);
    saveRequests(list);
    return request;
}

function updateRequestStatus(id, status) {
    const list = readRequests();
    const request = list.find(function (r) { return r.id === id; });
    if (!request) return null;
    request.status = status;
    request.updated_at = new Date().toISOString();
    saveRequests(list);
    return request;
}
