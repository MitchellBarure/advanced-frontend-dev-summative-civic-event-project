/**
 * db-seed.js — inserts demo accounts and a few events so the frontend
 * has something to show. Safe to run more than once.
 *
 * Demo accounts (development only):
 *   admin@civicevents.test / Admin@1234   (role: admin)
 *   user@civicevents.test  / User@1234    (role: user)
 *
 * Usage (from the backend folder):  npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';

const { Client } = pkg;

const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'civic-events-db',
});

const users = [
    { full_name: 'Admin User', email: 'admin@civicevents.test', password: 'Admin@1234', role: 'admin' },
    { full_name: 'Normal User', email: 'user@civicevents.test', password: 'User@1234', role: 'user' },
];

const day = 24 * 60 * 60 * 1000;
const at = (daysFromNow, hour) => {
    const d = new Date(Date.now() + daysFromNow * day);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
};

const events = [
    { title: 'Community Clean-Up Day', description: 'Join neighbours to tidy up the riverside park. Gloves and bags provided.', location: 'Riverside Park', starts_at: at(7, 9), ends_at: at(7, 13), published: true },
    { title: 'Town Hall: City Budget 2027', description: 'Hear the proposed budget and share your questions with council members.', location: 'City Hall, Main Chamber', starts_at: at(14, 18), ends_at: at(14, 20), published: true },
    { title: 'Free Health Screening', description: 'Blood pressure, glucose and eye checks by volunteer clinicians.', location: 'Central Library', starts_at: at(21, 10), ends_at: at(21, 15), published: true },
    { title: 'Draft: Winter Market (unpublished)', description: 'Admin-only draft to test the published filter.', location: 'Market Square', starts_at: at(30, 12), ends_at: at(30, 18), published: false },
];

try {
    await client.connect();

    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        const { rowCount } = await client.query(
            `INSERT INTO users (full_name, email, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (email) DO NOTHING`,
            [u.full_name, u.email, hash, u.role]
        );
        console.log(rowCount ? `✔ Created ${u.role}: ${u.email}` : `• ${u.email} already exists`);
    }

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM events');
    if (rows[0].n === 0) {
        for (const e of events) {
            await client.query(
                `INSERT INTO events (title, description, location, starts_at, ends_at, published)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [e.title, e.description, e.location, e.starts_at, e.ends_at, e.published]
            );
        }
        console.log(`✔ Inserted ${events.length} sample events`);
    } else {
        console.log(`• ${rows[0].n} events already present — sample events skipped`);
    }

    await client.end();
    console.log('Seed complete.');
} catch (err) {
    console.error('✖ Seed failed:', err.message);
    if (err.code === '42P01') console.error('  → Tables missing. Run `npm run db:setup` first.');
    process.exit(1);
}
