import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN
});

await db.batch(
	[
		`CREATE TABLE IF NOT EXISTS lists (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS todos (
			id TEXT PRIMARY KEY,
			list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			done INTEGER NOT NULL DEFAULT 0,
			date TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`
	],
	'write'
);

console.log('DB initialized.');
