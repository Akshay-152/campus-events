import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'campusly.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        full_name TEXT,
        college_id TEXT,
        course TEXT,
        department TEXT,
        semester TEXT,
        interests TEXT, -- JSON string
        preferred_categories TEXT, -- JSON string
        profile_photo TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        poster_path TEXT,
        event_date TEXT,
        start_time TEXT,
        end_time TEXT,
        venue TEXT,
        organizer TEXT,
        registration_deadline TEXT,
        capacity INTEGER,
        registration_type TEXT DEFAULT 'internal',
        registration_url TEXT,
        status TEXT DEFAULT 'draft',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        student_user_id INTEGER NOT NULL,
        registration_status TEXT DEFAULT 'registered',
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id),
        FOREIGN KEY (student_user_id) REFERENCES users (id),
        UNIQUE (event_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS event_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT,
        description TEXT,
        preferred_date TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_user_id) REFERENCES users (id)
    );
    ''')
    
    # Create default admin if not exists
    c.execute("SELECT * FROM users WHERE role = 'admin'")
    if not c.fetchone():
        c.execute("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)", 
                  ('admin', generate_password_hash('admin'), 'admin'))
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
