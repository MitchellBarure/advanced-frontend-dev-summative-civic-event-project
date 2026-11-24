// Demo data for the video: 10 residents, their event registrations and reviews.
// Everything goes through the API (same endpoints the frontend uses), nothing touches the DB directly.
// Safe to run twice: existing users log in, existing registrations and reviews are skipped.
//
// Run from frontend/:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/seed-demo.js
// (PowerShell: $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; node scripts/seed-demo.js)

const fs = require("fs");
const path = require("path");

// same API address as the frontend (js/config.js), unless API_BASE_URL is set
function apiBase() {
    if (process.env.API_BASE_URL) return process.env.API_BASE_URL + "/api";
    const config = fs.readFileSync(path.join(__dirname, "..", "js", "config.js"), "utf8");
    const match = config.match(/API_BASE_URL\s*=\s*"([^"]+)"/);
    return (match ? match[1] : "http://localhost:4000") + "/api";
}

const API = apiBase();
const PASSWORD = "Jacaranda#2026";

const USERS = [
    "Leon Smith", "Pelumi Ojo", "Ntabiseng Sibeko", "Rufaro Chikondo", "Daniel Barure",
    "Lily Kenzie", "Snehle Phasha", "Lungelo Ndlovhu", "Yedidia Ngoy", "Nissi Kapinga",
];

const CLEAN_UP = "Community Clean-Up Day";
const TOWN_HALL = "Town Hall: City Budget 2027";
const NIGHT_MARKET = "Jacaranda Night Market";
const HEALTH = "Free Health Screening";

const REGISTRATIONS = {
    "Leon Smith": [CLEAN_UP, TOWN_HALL, NIGHT_MARKET],
    "Pelumi Ojo": [NIGHT_MARKET, HEALTH],
    "Ntabiseng Sibeko": [CLEAN_UP, HEALTH, NIGHT_MARKET],
    "Rufaro Chikondo": [NIGHT_MARKET, TOWN_HALL],
    "Daniel Barure": [CLEAN_UP, HEALTH],
    "Lily Kenzie": [NIGHT_MARKET, HEALTH],
    "Snehle Phasha": [CLEAN_UP, NIGHT_MARKET, HEALTH],
    "Lungelo Ndlovhu": [TOWN_HALL, NIGHT_MARKET],
    "Yedidia Ngoy": [CLEAN_UP, HEALTH, NIGHT_MARKET],
    "Nissi Kapinga": [NIGHT_MARKET],
};

const REVIEWS = [
    ["Leon Smith", NIGHT_MARKET, 5, "Best night out in Pretoria in ages. The food stalls under the jacarandas were something else."],
    ["Pelumi Ojo", NIGHT_MARKET, 4, "Great vibe and live music. Parking around Church Square was tough, so take an Uber."],
    ["Rufaro Chikondo", NIGHT_MARKET, 5, "Brought my little brother and he loved the craft stalls. Please make this monthly!"],
    ["Lily Kenzie", NIGHT_MARKET, 4, "Lovely atmosphere, just a bit crowded after 7pm."],
    ["Lungelo Ndlovhu", NIGHT_MARKET, 3, "Good food but the queues were long. More card machines would help."],
    ["Ntabiseng Sibeko", CLEAN_UP, 5, "We filled 40 bags before lunch. Proud of our neighbourhood."],
    ["Daniel Barure", CLEAN_UP, 4, "Well organised, and the city brought gloves and water for everyone."],
    ["Yedidia Ngoy", CLEAN_UP, 4, "Met so many neighbours I'd never spoken to before."],
    ["Snehle Phasha", HEALTH, 5, "Quick and friendly. I had my blood pressure and sugar checked in 15 minutes."],
    ["Pelumi Ojo", HEALTH, 5, "The nurses explained everything clearly. Free and no stress."],
    ["Daniel Barure", HEALTH, 4, "Short wait and very professional. Remember to bring your ID."],
    ["Leon Smith", TOWN_HALL, 3, "Useful to hear the budget plans, but we ran out of time for questions."],
    ["Rufaro Chikondo", TOWN_HALL, 4, "Glad the city is listening. Hope the pothole money actually gets spent!"],
];

const DISABLE = "Nissi Kapinga";

function emailFor(name) {
    return name.toLowerCase().replace(" ", ".") + "@example.com";
}

// small fetch wrapper: returns { status, body } and never throws on 4xx/5xx
async function call(method, url, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(function () { return {}; });
    return { status: res.status, body: json };
}

async function login(email, password) {
    const res = await call("POST", "/auth/login", { email, password });
    if (res.status !== 200) throw new Error("Login failed for " + email + ": " + (res.body.message || res.status));
    return res.body.data.token;
}

// sign up, or log in if the account is already there (409)
async function signUpOrLogin(name, counts) {
    const email = emailFor(name);
    const res = await call("POST", "/auth/signup", { full_name: name, email, password: PASSWORD });
    if (res.status === 201 || res.status === 200) counts.users++;
    else if (res.status === 409) counts.usersExisting++;
    else throw new Error("Signup failed for " + email + ": " + (res.body.message || res.status));
    return login(email, PASSWORD);
}

async function main() {
    const counts = { users: 0, usersExisting: 0, registrations: 0, registrationsSkipped: 0, reviews: 0, reviewsSkipped: 0 };
    const failures = [];

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD first (see frontend/README.md, Demo data).");
        process.exit(1);
    }

    console.log("Seeding demo data through " + API);
    const adminToken = await login(adminEmail, adminPassword);

    // event titles → ids, published only (the draft stays alone)
    const events = (await call("GET", "/events", null, adminToken)).body.data || [];
    const eventId = {};
    events.filter(function (e) { return e.published; }).forEach(function (e) { eventId[e.title] = e.id; });

    const tokens = {};
    for (const name of USERS) {
        try {
            tokens[name] = await signUpOrLogin(name, counts);
        } catch (err) {
            failures.push(err.message);
        }
    }

    for (const name of USERS) {
        const token = tokens[name];
        if (!token) continue;
        // skip events this person already has an active registration for
        const mine = (await call("GET", "/event-registrations/my-registrations", null, token)).body.data || [];
        const active = mine.filter(function (r) { return r.status !== "cancelled"; }).map(function (r) { return r.event_id; });

        for (const title of REGISTRATIONS[name]) {
            const id = eventId[title];
            if (!id) { failures.push("No published event called \"" + title + "\""); continue; }
            if (active.includes(id)) { counts.registrationsSkipped++; continue; }
            const res = await call("POST", "/event-registrations/register", { event_id: id }, token);
            if (res.status === 201) counts.registrations++;
            else if (res.status === 409) counts.registrationsSkipped++;
            else failures.push(name + " → " + title + ": " + (res.body.message || res.status));
        }
    }

    for (const [name, title, rating, comment] of REVIEWS) {
        const token = tokens[name];
        const id = eventId[title];
        if (!token || !id) continue;
        // one review per person per event, so skip it if it's already there
        const mine = (await call("GET", "/event-feedback/my-feedback", null, token)).body.data || [];
        if (mine.some(function (f) { return f.event_id === id; })) { counts.reviewsSkipped++; continue; }
        const res = await call("POST", "/event-feedback", { event_id: id, rating, comment }, token);
        if (res.status === 201) counts.reviews++;
        else if (res.status === 409) counts.reviewsSkipped++;
        else failures.push("Review by " + name + " on " + title + ": " + (res.body.message || res.status));
    }

    // last step: switch one account off so the users table shows both states
    const users = (await call("GET", "/users", null, adminToken)).body.data || [];
    const target = users.find(function (u) { return u.email === emailFor(DISABLE); });
    if (!target) failures.push("Couldn't find " + DISABLE + " to disable");
    else {
        const res = await call("PATCH", "/users/" + target.id + "/disable", null, adminToken);
        if (res.status !== 200) failures.push("Disable " + DISABLE + ": " + (res.body.message || res.status));
    }

    console.log("Users created: " + counts.users + " (already there: " + counts.usersExisting + ")");
    console.log("Registrations created: " + counts.registrations + " (skipped: " + counts.registrationsSkipped + ")");
    console.log("Reviews created: " + counts.reviews + " (skipped: " + counts.reviewsSkipped + ")");
    console.log(DISABLE + " disabled: " + (target ? "yes" : "no"));
    if (failures.length) {
        console.log("\nProblems:");
        failures.forEach(function (f) { console.log("- " + f); });
        process.exitCode = 1;
    }
}

main().catch(function (err) {
    console.error("Seed failed: " + err.message);
    process.exit(1);
});
