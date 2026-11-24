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

// DEMO DATA: the backend has no service-request endpoint, so there's no way to seed these
// through the API like the users and registrations. Admins can load them from a button
// on Admin → Service requests, and only while this browser has no requests saved.
const DEMO_REQUESTS = [
    ["Leon Smith", "Road Repair", "Deep pothole on Lynnwood Road", "Lynnwood Road, near the Gautrain bus stop, Hatfield", "A big pothole in the left lane heading east. Cars swerve into the next lane to avoid it.", "in_progress"],
    ["Ntabiseng Sibeko", "Street Light Issue", "Streetlights out on Pierneef Street", "Pierneef Street, Brooklyn", "Three lights in a row have been off for two weeks. The street is very dark at night.", "submitted"],
    ["Pelumi Ojo", "Water Supply Issue", "Water leaking from the pavement", "Corner of Park Street and Hilda Street, Hatfield", "Clean water has been running down the street since Monday.", "in_progress"],
    ["Rufaro Chikondo", "Sanitation", "Refuse not collected this week", "Hamilton Street, Arcadia", "Our bins were missed on Tuesday and are still outside.", "resolved"],
    ["Daniel Barure", "General Complaint", "Jacaranda branch blocking the road", "Herbert Baker Street, Groenkloof", "A large branch fell in last night's storm and blocks half the road.", "resolved"],
    ["Lily Kenzie", "General Complaint", "Overgrown grass in the park", "Menlo Park, near the play area", "The grass is knee-high and kids can't use the play area.", "submitted"],
    ["Snehle Phasha", "Road Repair", "Potholes on Solomon Mahlangu Drive", "Solomon Mahlangu Drive, Mamelodi East", "Several potholes between the mall and the taxi rank.", "submitted"],
    ["Lungelo Ndlovhu", "Street Light Issue", "Traffic light not working", "Corner of Jan Shoba Street and Lynnwood Road, Hatfield", "The lights flash red in all directions during peak hour.", "in_progress"],
    ["Yedidia Ngoy", "Sanitation", "Illegal dumping on open land", "Open land near Saulsville station, Atteridgeville", "Builders' rubble and old furniture dumped close to houses.", "submitted"],
];

// users = the list from GET /users, so each request belongs to the real account
// (that's how the resident sees it on their own Services page)
function loadDemoRequests(users) {
    if (readRequests().length) return 0;
    const DAY = 24 * 60 * 60 * 1000;
    const list = DEMO_REQUESTS.map(function (r, i) {
        const user = users.find(function (u) { return u.full_name === r[0]; });
        // spread them over the last couple of weeks so the dates don't all match
        const created = new Date(Date.now() - (DEMO_REQUESTS.length - i) * 1.5 * DAY).toISOString();
        return {
            id: "demo-" + (i + 1),
            ref: "SR-" + (1001 + i),
            user_id: user ? user.id : null,
            user_name: r[0],
            type: r[1], title: r[2], address: r[3], details: r[4], status: r[5],
            created_at: created,
            updated_at: created,
        };
    });
    saveRequests(list);
    return list.length;
}
