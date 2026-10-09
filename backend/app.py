import os
import json
import secrets
from datetime import date
from flask import Flask, jsonify, request, g, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

import db
import ai

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "super_secret_dev_key"

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Simple in-memory session store (token -> dict with id, role, email)
SESSIONS = {}

def get_user_from_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    return SESSIONS.get(token)

def login_required(f):
    def wrapper(*args, **kwargs):
        user = get_user_from_token()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def admin_required(f):
    def wrapper(*args, **kwargs):
        user = get_user_from_token()
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'Admin required'}), 403
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route('/uploads/<name>')
def download_file(name):
    return send_from_directory(app.config["UPLOAD_FOLDER"], name)

@app.post('/api/auth/register')
def register():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
        
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email=?", (email,))
    if c.fetchone():
        return jsonify({'error': 'Email already registered'}), 409
        
    pwd_hash = generate_password_hash(password)
    c.execute("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)", (email, pwd_hash, 'student'))
    user_id = c.lastrowid
    
    # Create empty profile
    c.execute("INSERT INTO student_profiles (user_id, full_name, interests) VALUES (?, ?, ?)", (user_id, full_name, '[]'))
    
    conn.commit()
    conn.close()
    
    return jsonify({'ok': True}), 201

@app.post('/api/auth/login')
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT id, email, password_hash, role FROM users WHERE email=?", (email,))
    user = c.fetchone()
    conn.close()
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    token = secrets.token_hex(32)
    SESSIONS[token] = {'id': user['id'], 'email': user['email'], 'role': user['role']}
    
    return jsonify({'token': token, 'role': user['role'], 'email': user['email']})

@app.post('/api/auth/logout')
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in SESSIONS:
        del SESSIONS[token]
    return jsonify({'ok': True})

@app.get('/api/profile')
@login_required
def get_profile():
    user = get_user_from_token()
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM student_profiles WHERE user_id=?", (user['id'],))
    profile = c.fetchone()
    conn.close()
    if not profile: return jsonify({'error': 'Profile not found'}), 404
    
    return jsonify({
        'full_name': profile['full_name'],
        'college_id': profile['college_id'],
        'department': profile['department'],
        'course': profile['course'],
        'interests': json.loads(profile['interests'] or '[]')
    })

@app.put('/api/profile')
@login_required
def update_profile():
    user = get_user_from_token()
    data = request.json or {}
    interests = json.dumps(data.get('interests', []))
    conn = db.get_db()
    c = conn.cursor()
    c.execute("""
        UPDATE student_profiles 
        SET full_name=?, college_id=?, department=?, course=?, interests=?
        WHERE user_id=?
    """, (data.get('full_name'), data.get('college_id'), data.get('department'), data.get('course'), interests, user['id']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.get('/api/events')
def get_events():
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE status='published' AND event_date >= ?", (date.today().isoformat(),))
    events = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(events)

@app.get('/api/events/<int:event_id>')
def get_event(event_id):
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE id=?", (event_id,))
    event = c.fetchone()
    conn.close()
    return jsonify(dict(event)) if event else (jsonify({'error': 'Not found'}), 404)

@app.post('/api/events/<int:event_id>/register')
@login_required
def register_event(event_id):
    user = get_user_from_token()
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE id=?", (event_id,))
    event = c.fetchone()
    if not event or event['status'] != 'published':
        return jsonify({'error': 'Event unavailable'}), 404
        
    if event['event_date'] < date.today().isoformat():
        return jsonify({'error': 'Event passed'}), 400
        
    c.execute("SELECT COUNT(*) as count FROM event_registrations WHERE event_id=?", (event_id,))
    reg_count = c.fetchone()['count']
    if event['capacity'] and reg_count >= event['capacity']:
        return jsonify({'error': 'Event is full'}), 409
        
    try:
        c.execute("INSERT INTO event_registrations (event_id, student_user_id) VALUES (?, ?)", (event_id, user['id']))
        conn.commit()
    except:
        return jsonify({'error': 'Already registered'}), 409
    finally:
        conn.close()
        
    return jsonify({'ok': True})

@app.get('/api/my-registrations')
@login_required
def my_registrations():
    user = get_user_from_token()
    conn = db.get_db()
    c = conn.cursor()
    c.execute("""
        SELECT e.*, r.registration_status 
        FROM events e 
        JOIN event_registrations r ON e.id = r.event_id 
        WHERE r.student_user_id=?
    """, (user['id'],))
    events = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(events)

@app.post('/api/event-suggestions')
@login_required
def create_suggestion():
    user = get_user_from_token()
    data = request.json or {}
    conn = db.get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO event_suggestions (student_user_id, title, category, description, preferred_date, reason)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user['id'], data.get('title'), data.get('category'), data.get('description'), data.get('preferred_date'), data.get('reason')))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.get('/api/admin/suggestions')
@admin_required
def admin_get_suggestions():
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM event_suggestions")
    sugs = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(sugs)

@app.post('/api/admin/events')
@admin_required
def admin_create_event():
    user = get_user_from_token()
    data = request.form.to_dict()
    poster_path = None
    if 'poster' in request.files:
        file = request.files['poster']
        if file.filename:
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            poster_path = f"/uploads/{filename}"
            
    conn = db.get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO events (title, description, category, poster_path, event_date, start_time, end_time, venue, organizer, capacity, registration_url, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get('title'), data.get('description'), data.get('category'), poster_path,
        data.get('event_date'), data.get('start_time'), data.get('end_time'), data.get('venue'),
        data.get('organizer'), data.get('capacity'), data.get('registration_url'), 'published', user['id']
    ))
    conn.commit()
    conn.close()
    return jsonify({'ok': True}), 201

@app.put('/api/admin/events/<int:event_id>')
@admin_required
def admin_update_event(event_id):
    data = request.json or {}
    conn = db.get_db()
    c = conn.cursor()
    c.execute("UPDATE events SET title=?, description=?, event_date=?, status=?, registration_url=? WHERE id=?", 
              (data.get('title'), data.get('description'), data.get('event_date'), data.get('status'), data.get('registration_url'), event_id))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.delete('/api/admin/events/<int:event_id>')
@admin_required
def admin_delete_event(event_id):
    conn = db.get_db()
    c = conn.cursor()
    c.execute("DELETE FROM events WHERE id=?", (event_id,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.post('/api/ai/event-summary')
def ai_summary():
    data = request.json or {}
    description = data.get('description', '')
    summary = ai.generate_event_summary(description)
    if summary is None:
        return jsonify({'error': 'AI unavailable'}), 503
    return jsonify({'summary': summary})

@app.post('/api/ai/assistant')
def ai_assistant():
    data = request.json or {}
    question = data.get('question', '')
    conn = db.get_db()
    c = conn.cursor()
    c.execute("SELECT id, title, description, category, event_date, venue FROM events WHERE status='published'")
    events = [dict(row) for row in c.fetchall()]
    conn.close()
    
    answer = ai.answer_discovery_question(question, events)
    if answer is None:
        return jsonify({'error': 'AI unavailable'}), 503
    return jsonify({'answer': answer})

if __name__ == '__main__':
    db.init_db()
    app.run(debug=True, port=5000)
