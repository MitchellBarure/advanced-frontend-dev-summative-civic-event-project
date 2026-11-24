/**
 * db-setup.js — creates the database (if missing) and runs the migration.
 *
 * Why this exists: the original `npm run db:setup` script relied on `psql`
 * being on PATH and on a DB_PASSWORD shell variable, while `.env` uses DB_PASS.
 * This script reads the same `.env` the server uses, so one config drives both.
 *
 * Usage (from the backend folder):  npm run db:setup
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pkg from 'pg';

const { Client } = pkg;

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
};
const dbName = process.env.DB_NAME || 'civic-events-db';

async function ensureDatabase() {
    // Connect to the default "postgres" maintenance DB to create ours.
    const admin = new Client({ ...config, database: 'postgres' });
    await admin.connect();
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
        // Name contains a hyphen, so it must be double-quoted.
        await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
        console.log(`✔ Created database "${dbName}"`);
    } else {
        console.log(`• Database "${dbName}" already exists`);
    }
    await admin.end();
}

async function runMigration() {
    const client = new Client({ ...config, database: dbName });
    await client.connect();

    // The migration is not fully re-runnable (event_registrations has no IF NOT EXISTS),
    // so skip it when the schema is already there.
    const { rows } = await client.query(`SELECT to_regclass('public.event_feedback') AS t`);
    if (rows[0].t) {
        console.log('• Tables already exist — migration skipped');
    } else {
        const sql = fs.readFileSync(path.join(process.cwd(), 'migrations', '001_create_tables.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Ran migrations/001_create_tables.sql');
    }

    // FIX (frontend project): announcement transcripts. This one is safe to re-run, so it always runs
    const transcriptSql = fs.readFileSync(path.join(process.cwd(), 'migrations', '002_add_announcement_transcript.sql'), 'utf8');
    await client.query(transcriptSql);
    console.log('✔ Ran migrations/002_add_announcement_transcript.sql');
    await client.end();
}

try {
    await ensureDatabase();
    await runMigration();
    console.log('Database ready.');
} catch (err) {
    console.error('✖ Database setup failed:', err.message);
    if (err.code === '28P01') console.error('  → Wrong DB_USER / DB_PASS in backend/.env');
    if (err.code === 'ECONNREFUSED') console.error('  → PostgreSQL is not running on', `${config.host}:${config.port}`);
    process.exit(1);
}
