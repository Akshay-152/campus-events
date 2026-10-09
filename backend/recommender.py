from datetime import date

def recommend(events, profile, today=None):
    """Rule-based category/tag scoring with a department relevance bonus."""
    today = today or date.today().isoformat()
    interests = set(profile.get("interests", []))
    ranked = []
    for event in events:
        if event.get("status") != "published" or event.get("date", "") < today:
            continue
        score = (3 if event.get("category") in interests else 0)
        score += 2 * len(interests.intersection(event.get("tags", [])))
        if event.get("department") and event["department"] == profile.get("department"):
            score += 1
        if score:
            ranked.append({**event, "matchScore": score})
    return sorted(ranked, key=lambda event: (-event["matchScore"], event.get("date", "")))
