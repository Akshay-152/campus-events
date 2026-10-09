# Campusly — Campus Event Discovery

A responsive campus events application featuring student and admin authentication, SQLite database, and optional integration with Ollama AI (gemma3:4b).

## Prerequisites

- Python 3.8+
- SQLite3 (Included with Python)
- (Optional) [Ollama](https://ollama.com/) with the `gemma3:4b` model installed

## Run the Flask API (Backend)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application (This will automatically initialize `campusly.db`):
   ```bash
   python app.py
   ```
The API listens on `http://localhost:5000`.

## Run the Web App (Frontend)

Open `frontend/index.html` in a web browser. The frontend interacts directly with the local Flask API. 
**Note**: It requires the backend to be running to fetch events and authenticate.

## Authentication

- **Admin Login**: 
  - Email: `admin`
  - Password: `admin`
  *(Note: This is for local development only and provides access to the Organizer Studio)*
- **Student Login**: Use the Sign Up button to create a new student account.

## Ollama AI Integration (Optional)

The application includes AI-powered event recommendations, chat assistance, and summarization. 
To enable this feature:

1. Install and start Ollama locally.
2. Run: `ollama run gemma3:4b`
3. The backend will communicate with Ollama at `http://localhost:11434`. 
If Ollama is not running, the application will gracefully fall back to local rule-based recommendations and logic.

## Application Architecture

- **Backend**: Flask + SQLite. Manages Users, Profiles, Events, Registrations, and Suggestions.
- **Frontend**: Vanilla JavaScript (app.js, chatbot.js) and CSS. Communicates via REST APIs with JSON. 
- **Database**: The local `campusly.db` handles all persistence securely. Password hashes are stored securely. 
