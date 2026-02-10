import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_NAME = 'datrix_local.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or creates) the local SQLite database and runs migrations.
 * Call once at app startup.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better concurrent read/write performance
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Create all tables idempotently
  await db.execAsync(CREATE_TABLES_SQL);

  // Run migrations for existing databases (ALTER TABLE ADD COLUMN is a no-op if column exists)
  await runMigrations(db);

  return db;
}

/**
 * Returns true if the database has been initialized.
 */
export function isDatabaseReady(): boolean {
  return db !== null;
}

/**
 * Returns the singleton database instance.
 * Throws if initDatabase() hasn't been called yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Closes the database. Use during logout to release the file handle.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Deletes the entire local database. Used during logout for full cleanup.
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DB_NAME);
}

/**
 * Runs schema migrations for existing databases.
 * Each migration safely adds columns that may be missing.
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrations = [
    'ALTER TABLE projects ADD COLUMN client_id TEXT',
  ];

  for (const sql of migrations) {
    try {
      await database.execAsync(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
