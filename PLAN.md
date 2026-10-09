# Implementation Plan

1. **Database Setup (Backend)**
   - Create `backend/db.py` to initialize SQLite and define schemas for `users`, `student_profiles`, `events`, `event_registrations`, and `event_suggestions`.
   - Update `backend/app.py` to use the database instead of in-memory data structures.

2. **Authentication (Backend + Frontend)**
   - Add routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`.
   - Update `app.py` to handle session/token for admin and students.
   - Update frontend to include Login/Sign-up forms.
   - Restrict admin endpoints and UI elements to authenticated admins (`admin`/`admin`).
   - Implement student session persistence on the frontend.

3. **User Profile & Suggestions (Backend + Frontend)**
   - Add routes for profile (`GET /api/profile`, `PUT /api/profile`) and suggestions (`POST /api/event-suggestions`, `GET /api/admin/suggestions`).
   - Create frontend UI for profile editing and suggestion submission.

4. **Event Management Updates (Backend + Frontend)**
   - Modify existing `/api/admin/events` routes to interact with SQLite.
   - Support adding images (upload route) and external URLs (Google Forms).
   - Integrate poster uploads (save in a local directory).

5. **Ollama Integration (Backend + Frontend)**
   - Create `backend/ai.py` containing logic to query Ollama API (`http://localhost:11434/api/chat`).
   - Add routes `/api/ai/recommendations`, `/api/ai/event-summary`, `/api/ai/assistant`.
   - Modify the frontend to surface these features (e.g. Chatbot for discovery, AI Summarize button for admin).

6. **Testing & Polish**
   - Ensure app runs from `app.py` and front end handles missing AI gracefully.
   - Update README.md with instructions.
