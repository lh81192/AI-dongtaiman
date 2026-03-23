import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'manju.db');

export const db: Database.Database = (() => {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Initialize database
  const database = new Database(DB_PATH);

  // Enable WAL journal mode
  database.pragma('journal_mode = WAL');

  // Enable foreign keys
  database.pragma('foreign_keys = ON');

  return database;
})();

export function initDb(): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      epub_path TEXT NOT NULL,
      cover_image TEXT,
      status TEXT DEFAULT 'pending',
      video_url TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Project configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_configs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      voice_model TEXT DEFAULT 'gpt-sovits',
      voice_params TEXT,
      bgm_model TEXT DEFAULT 'minimax',
      sfx_model TEXT DEFAULT 'elevenlabs',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      input_data TEXT,
      output_data TEXT,
      error_message TEXT,
      progress INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Likes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, project_id)
    )
  `);

  // Favorites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, project_id)
    )
  `);

  // Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_likes_project_id ON likes(project_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_project_id ON favorites(project_id);
    CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
  `);

  // User model configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_model_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('text', 'image', 'video')),
      protocol TEXT NOT NULL CHECK(protocol IN ('domestic', 'openai', 'gemini', 'seedance', 'google')),
      name TEXT NOT NULL,
      api_url TEXT,
      api_key TEXT,
      enabled INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      model_ids TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_model_configs_user_id ON user_model_configs(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_model_configs_provider_type ON user_model_configs(provider_type);
  `);

  // Scenes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      page_index INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      raw_text TEXT,
      scene_description TEXT,
      camera_type TEXT,
      character_actions TEXT,
      dialogues TEXT,
      mood TEXT,
      sequence_index INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Key frames table
  db.exec(`
    CREATE TABLE IF NOT EXISTS key_frames (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      frame_type TEXT NOT NULL CHECK(frame_type IN ('first', 'last')),
      image_url TEXT,
      prompt TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      UNIQUE(scene_id, frame_type)
    )
  `);

  // Video clips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_clips (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      first_frame_id TEXT,
      last_frame_id TEXT,
      video_url TEXT,
      duration REAL,
      prompt TEXT,
      status TEXT DEFAULT 'pending',
      model_used TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      FOREIGN KEY (first_frame_id) REFERENCES key_frames(id) ON DELETE SET NULL,
      FOREIGN KEY (last_frame_id) REFERENCES key_frames(id) ON DELETE SET NULL
    )
  `);

  // Audio tracks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_tracks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      track_type TEXT NOT NULL CHECK(track_type IN ('voice', 'bgm', 'sfx')),
      scene_id TEXT,
      audio_url TEXT,
      duration REAL,
      prompt TEXT,
      voice_id TEXT,
      model_used TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL
    )
  `);

  // Pipeline status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_status (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      current_step TEXT,
      total_scenes INTEGER DEFAULT 0,
      processed_scenes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
    CREATE INDEX IF NOT EXISTS idx_key_frames_scene_id ON key_frames(scene_id);
    CREATE INDEX IF NOT EXISTS idx_video_clips_scene_id ON video_clips(scene_id);
    CREATE INDEX IF NOT EXISTS idx_audio_tracks_project_id ON audio_tracks(project_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_status_project_id ON pipeline_status(project_id);
    CREATE INDEX IF NOT EXISTS idx_audio_tracks_scene_id ON audio_tracks(scene_id);
    CREATE INDEX IF NOT EXISTS idx_video_clips_first_frame_id ON video_clips(first_frame_id);
    CREATE INDEX IF NOT EXISTS idx_video_clips_last_frame_id ON video_clips(last_frame_id);
  `);

  console.log('Database initialized successfully!');
}

// Auto-initialize on module load
initDb();

export default db;
