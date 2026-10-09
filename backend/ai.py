import requests
import json
import os

OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434/api/chat')
MODEL_NAME = os.environ.get('OLLAMA_MODEL', 'gemma3:4b')
TIMEOUT = 15

def get_ai_response(prompt, system_prompt="You are a helpful campus event assistant."):
    try:
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }
        response = requests.post(OLLAMA_URL, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        return data.get('message', {}).get('content', '')
    except Exception as e:
        print(f"Ollama API Error: {e}")
        return None

def generate_event_summary(description):
    system = "You are a concise assistant. Summarize the event description in 1-2 short sentences."
    return get_ai_response(description, system)

def refine_event_suggestion(title, description):
    system = "You are an event assistant. The user wants to suggest an event. Refine the title and description to sound professional and appealing. Output in JSON format with keys 'title' and 'description'."
    prompt = f"Title: {title}\nDescription: {description}"
    return get_ai_response(prompt, system)

def answer_discovery_question(question, events):
    system = "You are a campus event discovery assistant. Use the provided list of events (in JSON format) to answer the user's question accurately. Do not invent events."
    prompt = f"Available Events: {json.dumps(events)}\n\nUser Question: {question}"
    return get_ai_response(prompt, system)

def generate_recommendations(profile, events):
    system = "You are a recommender. Given the user profile and events, recommend the best events. Return a comma-separated list of event IDs that match well."
    prompt = f"Profile: {json.dumps(profile)}\n\nEvents: {json.dumps(events)}"
    resp = get_ai_response(prompt, system)
    return resp
