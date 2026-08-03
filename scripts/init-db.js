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
			created_at INTEGER NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			is_separator INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS todos (
			id TEXT PRIMARY KEY,
			list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			done INTEGER NOT NULL DEFAULT 0,
			date TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			note TEXT NOT NULL DEFAULT ''
		)`
	],
	'write'
);

// ALTER TABLE for pre-existing databases created before these columns existed.
// SQLite/libSQL has no "ADD COLUMN IF NOT EXISTS", so check first.
const todoColumns = await db.execute('PRAGMA table_info(todos)');
if (!todoColumns.rows.some((row) => row.name === 'note')) {
	await db.execute("ALTER TABLE todos ADD COLUMN note TEXT NOT NULL DEFAULT ''");
	console.log('Added missing `note` column to todos.');
}

const listColumns = await db.execute('PRAGMA table_info(lists)');
if (!listColumns.rows.some((row) => row.name === 'sort_order')) {
	await db.execute('ALTER TABLE lists ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
	// Backfill using existing creation order so current display order doesn't jump.
	await db.execute(`
		UPDATE lists SET sort_order = (
			SELECT COUNT(*) FROM lists AS l2
			WHERE l2.created_at < lists.created_at
				OR (l2.created_at = lists.created_at AND l2.id <= lists.id)
		)
	`);
	console.log('Added missing `sort_order` column to lists and backfilled by creation order.');
}

if (!listColumns.rows.some((row) => row.name === 'is_separator')) {
	await db.execute('ALTER TABLE lists ADD COLUMN is_separator INTEGER NOT NULL DEFAULT 0');
	console.log('Added missing `is_separator` column to lists.');
}

console.log('DB initialized.');
