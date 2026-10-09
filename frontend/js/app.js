const API_BASE = 'http://localhost:5000/api';
let authToken = localStorage.getItem('campus_token');
let authRole = localStorage.getItem('campus_role');
let authEmail = localStorage.getItem('campus_email');

let events = [];
let interests = [];
let saved = JSON.parse(localStorage.getItem('campus_saved') || '[]');
let registered = [];
let view = 'discover';
let categoryFilter = '';
let searchTerm = '';

const categories = ['AI', 'Coding', 'Sports', 'Music', 'Arts', 'Entrepreneurship', 'Volunteering', 'Technology', 'Wellness', 'Community'];
const icons = { AI: '✳', Coding: '⌘', Sports: '↗', Music: '♫', Arts: '✿', Entrepreneurship: '↗', Volunteering: '❋', Technology: '⌘' };

let authMode = 'login'; // 'login' or 'register'

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('nameField').style.display = authMode === 'register' ? 'block' : 'none';
    document.querySelector('#authForm button').textContent = authMode === 'login' ? 'Sign In' : 'Sign Up';
    document.getElementById('authToggleText').textContent = authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in";
}

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (authMode === 'register') {
        const full_name = document.getElementById('authName').value;
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name })
        });
        if (res.ok) {
            toast('Registration successful. Please log in.');
            toggleAuthMode();
        } else {
            const data = await res.json();
            toast(data.error || 'Registration failed');
        }
    } else {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (res.ok) {
            const data = await res.json();
            authToken = data.token;
            authRole = data.role;
            authEmail = data.email;
            localStorage.setItem('campus_token', authToken);
            localStorage.setItem('campus_role', authRole);
            localStorage.setItem('campus_email', authEmail);
            document.getElementById('authModal').style.display = 'none';
            initData();
        } else {
            const data = await res.json();
            toast(data.error || 'Login failed');
        }
    }
};

function authHeaders() {
    return { 'Authorization': `Bearer ${authToken}` };
}

async function fetchJSON(url, options = {}) {
    options.headers = { ...options.headers, ...authHeaders() };
    const res = await fetch(url, options);
    if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    return res;
}

function logout() {
    fetchJSON(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_role');
    localStorage.removeItem('campus_email');
    authToken = null;
    document.getElementById('authModal').style.display = 'flex';
}

async function initData() {
    if (!authToken) {
        document.getElementById('authModal').style.display = 'flex';
        return;
    }
    document.getElementById('authModal').style.display = 'none';

    // Hide admin tab for non-admins
    document.querySelector('[data-view="admin"]').style.display = authRole === 'admin' ? 'block' : 'none';

    try {
        const [eventsRes, profileRes, regRes] = await Promise.all([
            fetch(`${API_BASE}/events`).then(r => r.json()),
            fetchJSON(`${API_BASE}/profile`).then(r => r.json()),
            fetchJSON(`${API_BASE}/my-registrations`).then(r => r.json())
        ]);
        
        events = Array.isArray(eventsRes) ? eventsRes : [];
        interests = (profileRes && profileRes.interests) || [];
        registered = Array.isArray(regRes) ? regRes.map(e => e.id) : [];
        
        // Update user profile mini
        const profileMini = document.querySelector('.profile-mini div');
        if (profileMini) {
            profileMini.innerHTML = `<strong>${profileRes.full_name || authEmail}</strong><small>${profileRes.department || 'Student'}</small>`;
        }
        
        render();
    } catch (e) {
        console.error(e);
    }
}

const today = new Date();
function persistSaved() {
    localStorage.setItem('campus_saved', JSON.stringify(saved));
}

function fmt(d) {
    if(!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function month(d) {
    if(!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}
function score(e) {
    return (interests.includes(e.category) ? 3 : 0);
}
function upcoming() {
    return events.filter(e => e.status === 'published' && e.event_date >= today.toISOString().slice(0, 10)).sort((a, b) => a.event_date.localeCompare(b.event_date));
}
function art(e) {
    return 'art-' + (e.category || 'default').toLowerCase().replace(/[^a-z]/g, '');
}

function card(e) {
    let s = score(e);
    const dateStr = e.event_date ? new Date(e.event_date + 'T12:00:00').getDate() : '';
    const mStr = e.event_date ? month(e.event_date) : '';
    const imgStyle = e.poster_path ? `style="background-image: url('http://localhost:5000${e.poster_path}'); background-size: cover;"` : '';
    
    return `<article class="event-card" onclick="openEvent('${e.id}')">
        <div class="event-art ${art(e)}" data-mark="✦" ${imgStyle}>
            <div class="date-float"><b>${dateStr}</b><small>${mStr}</small></div>
            <button class="save-btn ${saved.includes(e.id) ? 'saved' : ''}" onclick="event.stopPropagation();toggleSave('${e.id}')">${saved.includes(e.id) ? '♥' : '♡'}</button>
            <span class="art-symbol">✦</span>
        </div>
        <div class="event-info">
            <div class="card-meta"><span class="tag">${e.category || 'Event'}</span>${s ? `<span class="match">✦ ${s} MATCH POINTS</span>` : ''}</div>
            <h3>${e.title}</h3>
            <p>${(e.description || '').substring(0,100)}...</p>
            <div class="event-bottom">
                <span>◷ ${fmt(e.event_date)} · ${e.start_time}</span>
                <span>⌖ ${e.venue ? e.venue.split('·')[0].trim() : 'TBA'}</span>
            </div>
        </div>
    </article>`;
}

function setView(v) {
    view = v;
    categoryFilter = '';
    searchTerm = '';
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === v));
    render();
}
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => setView(b.dataset.view));

async function render() {
    document.getElementById('savedCount').textContent = saved.length;
    let root = document.getElementById('viewRoot');
    let labels = { discover: 'For you', events: 'All events', saved: 'Saved events', registered: 'My registrations', interests: 'My interests', admin: 'Organizer studio', programs: 'Programs', suggest: 'Suggest event' };
    
    if (document.getElementById('crumbCurrent')) {
        document.getElementById('crumbCurrent').textContent = labels[view] || '';
    }

    if (view === 'interests') return renderInterests(root);
    if (view === 'admin') return renderAdmin(root);
    if (view === 'suggest') return renderSuggest(root);
    if (view === 'programs') return; // Handled by programs.js if needed

    let list = upcoming();
    if (view === 'discover') list = list.filter(e => score(e) > 0).sort((a, b) => score(b) - score(a) || a.event_date.localeCompare(b.event_date)).slice(0, 3);
    if (view === 'saved') list = list.filter(e => saved.includes(e.id));
    if (view === 'registered') list = list.filter(e => registered.includes(e.id));

    let html = '';
    if (view === 'discover') {
        html += `<div class="welcome"><div><div class="eyebrow">HELLO</div><h1>Find your next thing.</h1><p>A little something for the curious.</p></div></div>
        <div class="section-head"><div><h2>Picked for you</h2></div><button class="text-button" onclick="setView('events')">See all events →</button></div>`;
    } else {
        html += `<div class="page-head"><div class="eyebrow">CAMPUSLY / ${(labels[view] || '').toUpperCase()}</div><h1 class="page-title">${labels[view]}</h1></div>`;
    }

    if (view !== 'discover') {
        html += `<div class="filters"><input class="search" placeholder="⌕  Search events" value="${searchTerm}" oninput="searchTerm=this.value;render()">
        <select class="filter-select" onchange="categoryFilter=this.value;render()">
            <option value="">All categories</option>
            ${categories.map(c => `<option ${categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select></div>`;
    }

    if (view === 'discover') {
        html += `<div class="event-grid">${list.length ? list.map(card).join('') : '<div class="empty">Choose interests to see recommendations.<br><br><button class="button" onclick="setView(\'interests\')">Choose interests</button></div>'}</div>
        <div class="section-head"><div><h2>Coming up on campus</h2></div><button class="text-button" onclick="setView('events')">Browse calendar →</button></div>
        <div class="event-grid">${upcoming().slice(0, 3).map(card).join('')}</div>`;
    } else {
        const filteredList = list.filter(e => (!categoryFilter || e.category === categoryFilter) && (!searchTerm || `${e.title} ${e.category} ${e.description}`.toLowerCase().includes(searchTerm.toLowerCase())));
        html += `<div class="event-grid">${filteredList.map(card).join('') || `<div class="empty">No events found.</div>`}</div>`;
    }
    
    root.innerHTML = html;
}

function renderInterests(root) {
    root.innerHTML = `<div class="page-head"><div class="eyebrow">MAKE IT YOURS</div><h1 class="page-title">What are you into?</h1><p class="page-sub">Pick a few interests and we’ll bring the right events your way.</p></div>
    <div class="interest-grid">
        ${categories.map(c => `<label class="interest-option ${interests.includes(c) ? 'selected' : ''}"><input type="checkbox" value="${c}" ${interests.includes(c) ? 'checked' : ''} onchange="toggleInterest('${c}')"><span>${icons[c] || '✦'}</span>${c}</label>`).join('')}
    </div>
    <button class="button" onclick="saveInterests()">Save my interests</button>`;
}

function toggleInterest(c) {
    interests = interests.includes(c) ? interests.filter(x => x !== c) : [...interests, c];
    renderInterests(document.getElementById('viewRoot'));
}

async function saveInterests() {
    try {
        await fetchJSON(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interests })
        });
        toast('Your interests are updated');
        initData(); // Refresh recommended list
        setView('discover');
    } catch (e) {
        toast('Failed to update interests');
    }
}

function renderAdmin(root) {
    if (authRole !== 'admin') {
        root.innerHTML = `<div class="empty">Unauthorized access.</div>`;
        return;
    }
    root.innerHTML = `<div class="page-head"><div class="eyebrow">FOR EVENT ORGANIZERS</div><h1 class="page-title">Organizer studio</h1></div>
    <div class="admin-panel">
        <h2 style="font:700 16px var(--serif);margin:0 0 17px">Publish an event</h2>
        <form id="eventForm">
            <div class="form-grid">
                <div class="field"><label>EVENT NAME</label><input name="title" required></div>
                <div class="field"><label>CATEGORY</label><select name="category">${categories.map(c => `<option>${c}</option>`).join('')}</select></div>
                <div class="field"><label>DATE</label><input name="event_date" type="date" required min="${today.toISOString().slice(0, 10)}"></div>
                <div class="field"><label>START TIME</label><input name="start_time" type="time" required></div>
                <div class="field"><label>END TIME</label><input name="end_time" type="time"></div>
                <div class="field"><label>VENUE</label><input name="venue" required></div>
                <div class="field"><label>CAPACITY</label><input name="capacity" type="number" min="1"></div>
                <div class="field"><label>POSTER IMAGE</label><input name="poster" type="file" accept="image/*"></div>
                <div class="field"><label>EXTERNAL REGISTRATION URL</label><input name="registration_url" type="url" placeholder="Optional Google Form link"></div>
                <div class="field full"><label>DESCRIPTION</label><textarea name="description" required></textarea></div>
            </div>
            <div class="form-actions"><button type="submit" class="button">Publish event →</button></div>
        </form>
    </div>
    <div class="section-head"><div><h2>Your published events</h2></div></div>
    <div class="event-grid">${events.filter(e => e.status === 'published').map(card).join('')}</div>`;

    document.getElementById('eventForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const res = await fetchJSON(`${API_BASE}/admin/events`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                toast('Event published');
                initData(); // reload events
            } else {
                toast('Failed to publish');
            }
        } catch (err) {
            toast('Failed to publish');
        }
    };
}

function renderSuggest(root) {
    root.innerHTML = `<div class="page-head"><div class="eyebrow">GOT AN IDEA?</div><h1 class="page-title">Suggest an event</h1><p class="page-sub">Have an event idea? Let us know!</p></div>
    <div class="admin-panel">
        <form id="suggestForm">
            <div class="form-grid">
                <div class="field"><label>EVENT NAME</label><input name="title" required></div>
                <div class="field"><label>CATEGORY</label><select name="category">${categories.map(c => `<option>${c}</option>`).join('')}</select></div>
                <div class="field"><label>PREFERRED DATE</label><input name="preferred_date" type="date"></div>
                <div class="field"><label>REASON</label><input name="reason" placeholder="Why should we host this?"></div>
                <div class="field full"><label>DESCRIPTION</label><textarea name="description" required></textarea></div>
            </div>
            <div class="form-actions"><button type="submit" class="button">Submit Suggestion</button></div>
        </form>
    </div>`;

    document.getElementById('suggestForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            const res = await fetchJSON(`${API_BASE}/event-suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast('Suggestion submitted!');
                setView('discover');
            } else {
                toast('Failed to submit suggestion');
            }
        } catch (err) {
            toast('Failed to submit suggestion');
        }
    };
}

function toggleSave(id) {
    saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    persistSaved();
    toast(saved.includes(id) ? 'Added to your saved events' : 'Removed from saved events');
    render();
}

async function openEvent(id) {
    const e = events.find(x => x.id == id);
    if (!e) return;
    
    const isRegistered = registered.includes(e.id);
    let regButton = '';
    
    if (e.registration_url) {
        regButton = `<a class="button" href="${e.registration_url}" target="_blank">Register Externally ↗</a>`;
    } else {
        regButton = `<button class="button" onclick="registerEvent('${e.id}')">${isRegistered ? 'You’re registered ✓' : 'Save my spot →'}</button>`;
    }

    const imgStyle = e.poster_path ? `style="background-image: url('http://localhost:5000${e.poster_path}'); background-size: cover;"` : '';

    document.getElementById('modalRoot').innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
        <div class="modal">
            <div class="event-art ${art(e)}" data-mark="✦" ${imgStyle}>
                <div class="date-float"><b>${new Date(e.event_date + 'T12:00:00').getDate()}</b><small>${month(e.event_date)}</small></div>
                <button class="save-btn" onclick="toggleSave('${e.id}')">${saved.includes(e.id) ? '♥' : '♡'}</button>
            </div>
            <div class="modal-body">
                <span class="tag">${e.category}</span>
                <h2>${e.title}</h2>
                <p>${e.description}</p>
                <button class="button" style="margin: 10px 0; background: var(--surface); color: var(--text);" onclick="summarizeEvent('${e.description}')">✨ AI Summarize</button>
                <div class="modal-details">
                    <div><span>DATE & TIME</span><strong>${fmt(e.event_date)} · ${e.start_time}</strong></div>
                    <div><span>VENUE</span><strong>${e.venue}</strong></div>
                    <div><span>ORGANIZED BY</span><strong>${e.organizer || 'Campus organizer'}</strong></div>
                    <div><span>SPOTS</span><strong>${e.capacity || 'Open'} capacity</strong></div>
                </div>
                ${regButton}
                <button class="button outline" onclick="closeModal()">Close</button>
            </div>
        </div>
    </div>`;
}

async function summarizeEvent(description) {
    toast('Generating summary...');
    try {
        const res = await fetch(`${API_BASE}/ai/event-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description })
        });
        const data = await res.json();
        if (data.summary) {
            alert("AI Summary:\n" + data.summary);
        } else {
            toast('AI Summary not available.');
        }
    } catch (e) {
        toast('Failed to summarize.');
    }
}

function closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
}

async function registerEvent(id) {
    if (registered.includes(Number(id)) || registered.includes(String(id))) return toast('You’re already registered');
    
    try {
        const res = await fetchJSON(`${API_BASE}/events/${id}/register`, {
            method: 'POST'
        });
        if (res.ok) {
            toast('You’re on the list. See you there!');
            initData(); // refresh registered
            closeModal();
        } else {
            const data = await res.json();
            toast(data.error || 'Failed to register');
        }
    } catch (e) {
        toast('Error registering');
    }
}

function toast(s) {
    let t = document.getElementById('toast');
    t.textContent = s;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2300);
}

// Initial boot
if (authToken) {
    initData();
} else {
    document.getElementById('authModal').style.display = 'flex';
}
