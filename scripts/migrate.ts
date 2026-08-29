/**
 * CodeForge AI — Database Migration Script
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createDatabaseClient } from '../src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  const db = createDatabaseClient();

  try {
    // Check connection
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error('Database connection failed');
    }
    console.log('Database connection established');

    // Get migration files
    const migrationsPath = join(__dirname, '..', 'db', 'migrations');
    const files = readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration(s):`);
    for (const file of files) {
      console.log(`  - ${file}`);
    }

    // Run migrations
    for (const file of files) {
      const sql = readFileSync(join(migrationsPath, file), 'utf-8');
      console.log(`\nApplying: ${file}...`);

      try {
        await db.query(sql);
        console.log(`  ✓ Applied successfully`);
      } catch (error) {
        console.error(`  ✗ Failed:`, error);
        throw error;
      }
    }

    console.log('\n✓ All migrations applied successfully');
  } finally {
    await db.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { runMigrations };