from datetime import date
from flask import Flask, jsonify, request
from flask_cors import CORS
from recommender import recommend

app = Flask(__name__)
CORS(app)
EVENTS = [
    {"id":"e1","title":"AI & Innovation Summit","category":"AI","tags":["AI","Technology","Entrepreneurship"],"date":"2026-10-13","startTime":"10:00","endTime":"16:00","venue":"Innovation Hub · Hall A","organizer":"Computer Science Society","description":"A full day of ideas, demos, and conversations about how artificial intelligence is shaping the world around us.","capacity":180,"status":"published","department":"Computer Science"},
    {"id":"e2","title":"Indie Night: Open Mic","category":"Music","tags":["Music","Arts","Community"],"date":"2026-10-15","startTime":"18:30","endTime":"21:00","venue":"The Courtyard","organizer":"Campus Arts Collective","description":"An easygoing evening for live music, spoken word, and good company.","capacity":120,"status":"published"},
    {"id":"e3","title":"Campus 5K & Wellness Fair","category":"Sports","tags":["Sports","Wellness"],"date":"2026-10-17","startTime":"07:30","endTime":"11:30","venue":"North Gate","organizer":"Student Wellness Council","description":"Run, walk, or cheer. The morning wraps up with a wellness fair.","capacity":250,"status":"published"},
]
PROGRAMS = []
PROFILES = {"demo-student":{"interests":["AI","Coding","Music","Entrepreneurship"],"department":"Computer Science","year":2}}
REGISTRATIONS = set()

@app.get('/api/events')
def events():
    return jsonify([e for e in EVENTS if e['status']=='published' and e['date']>=date.today().isoformat()])

@app.get('/api/programs')
def programs():
    return jsonify([p for p in PROGRAMS if p['status']=='published'])

@app.get('/api/events/<event_id>')
def event_detail(event_id):
    event = next((e for e in EVENTS if e['id']==event_id), None)
    return (jsonify(event), 200) if event else (jsonify({'error':'Event not found'}), 404)

@app.get('/api/recommendations')
def recommendations():
    profile = PROFILES.get(request.args.get('uid','demo-student'), PROFILES['demo-student'])
    return jsonify(recommend(EVENTS, profile))

@app.put('/api/profile/interests')
def update_interests():
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get('interests'), list): return jsonify({'error':'interests must be a list'}), 400
    PROFILES.setdefault(data.get('uid','demo-student'), {}).update({'interests':data['interests']})
    return jsonify({'ok':True,'interests':data['interests']})

@app.post('/api/events/<event_id>/register')
def register(event_id):
    uid = (request.get_json(silent=True) or {}).get('uid','demo-student')
    event = next((e for e in EVENTS if e['id']==event_id), None)
    if not event or event['status']!='published': return jsonify({'error':'Event unavailable'}), 404
    if event.get('date','') < date.today().isoformat(): return jsonify({'error':'Event has passed'}), 400
    key = (event_id, uid)
    if key in REGISTRATIONS: return jsonify({'error':'Already registered'}), 409
    if len([r for r in REGISTRATIONS if r[0]==event_id]) >= event.get('capacity',10**9): return jsonify({'error':'Event is full'}), 409
    REGISTRATIONS.add(key)
    return jsonify({'ok':True,'eventId':event_id}), 201

@app.get('/api/my-registrations')
def my_registrations():
    uid = request.args.get('uid','demo-student')
    return jsonify([e for eid,u in REGISTRATIONS if u==uid for e in EVENTS if e['id']==eid])

@app.post('/api/admin/events')
def create_event():
    data = request.get_json(silent=True) or {}
    required = ('title','category','date','startTime','venue','description')
    if any(not data.get(k) for k in required): return jsonify({'error':'Missing required event fields'}), 400
    data.update(id='e'+str(len(EVENTS)+1), status='published', tags=data.get('tags',[data['category']]))
    EVENTS.append(data)
    return jsonify(data), 201

@app.post('/api/admin/programs')
def create_program():
    data = request.get_json(silent=True) or {}
    if not data.get('title') or not data.get('description'):
        return jsonify({'error':'Program title and description are required'}), 400
    data.update(id='p'+str(len(PROGRAMS)+1), status='published')
    PROGRAMS.append(data)
    return jsonify(data), 201

@app.put('/api/admin/events/<event_id>')
def update_event(event_id):
    event = next((e for e in EVENTS if e['id']==event_id), None)
    if not event: return jsonify({'error':'Event not found'}), 404
    event.update(request.get_json(silent=True) or {})
    return jsonify(event)

@app.post('/api/admin/events/<event_id>/cancel')
def cancel_event(event_id):
    event = next((e for e in EVENTS if e['id']==event_id), None)
    if not event: return jsonify({'error':'Event not found'}), 404
    event['status']='cancelled'
    return jsonify({'ok':True})

if __name__ == '__main__': app.run(debug=True, port=5000)
