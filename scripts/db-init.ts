import path from 'path';
import fs from 'fs';
import { initDb } from '../src/lib/db';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created data directory: ${DATA_DIR}`);
}

// Initialize database
initDb();

console.log('Database initialization complete!');
