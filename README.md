# Campusly — Campus Event Discovery

A responsive campus events MVP based on `PLAN.md`. The frontend is a self-contained demo with browser storage; the Flask API implements planned event, recommendation, profile and registration flows.

## Run the web app

Open `frontend/index.html` in a browser. Demo interactions and student state are stored locally in that browser.

## Run the Flask API

From `backend/`, install `requirements.txt`, then run `python app.py`. The API listens on `http://localhost:5000`.

## API

- `GET /api/events` — published upcoming events
- `GET /api/events/<event_id>` — event details
- `GET /api/programs` — published campus programs
- `GET /api/recommendations?uid=demo-student` — scored recommendations
- `PUT /api/profile/interests` — update interests
- `POST /api/events/<event_id>/register` — registration with duplicate and capacity checks
- `GET /api/my-registrations?uid=demo-student` — registrations
- `POST /api/admin/events` — create an event
- `POST /api/admin/programs` — add and publish a campus program
- `PUT /api/admin/events/<event_id>` — update an event
- `POST /api/admin/events/<event_id>/cancel` — cancel an event

## Demo limitations

No Firebase project or credentials were supplied. Browser state uses localStorage and API data is in memory. API admin routes are scaffolding only: add Firebase Authentication token verification, role checks, Firestore transactions and security rules before production. API event data resets when Flask restarts.
