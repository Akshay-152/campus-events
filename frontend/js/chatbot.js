(() => {
  const panel = document.getElementById('chatPanel');
  const messages = document.getElementById('chatMessages');
  const input = document.getElementById('chatInput');
  const clean = value => (value || '').toLowerCase();
  
  function bubble(text, who='bot') {
    const node = document.createElement('div'); 
    node.className = `chat-message ${who}`;
    node.textContent = text; 
    messages.appendChild(node); 
    messages.scrollTop = messages.scrollHeight; 
    return node;
  }
  
  function choices(items) {
    const row = document.createElement('div'); 
    row.className = 'chat-suggestions';
    items.forEach(label => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.onclick = () => answer(label);
      row.appendChild(b);
    });
    messages.appendChild(row); 
    messages.scrollTop = messages.scrollHeight;
  }
  
  function showMatches(items, kind) {
    const wrap = document.createElement('div');
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'chat-recommendation';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('span');
      detail.textContent = kind === 'program' 
        ? `${item.category||'Campus'} · ${item.schedule||'Ongoing'}`
        : `${item.category} · ${new Date(item.event_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${item.start_time}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = kind === 'program' ? 'Browse programs' : 'View event';
      button.onclick = () => {
        panel.hidden = true;
        if(kind === 'program') setView('programs');
        else openEvent(item.id);
      };
      card.append(title, detail, document.createElement('br'), button);
      wrap.appendChild(card);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  async function answer(raw) {
    const text = (raw || '').trim();
    if (!text) return;
    bubble(text, 'user');
    input.value = '';
    
    // Quick local intercepts for basic greetings
    const q = clean(text);
    if (/^(hi|hello|hey|help)\b/.test(q)) {
      bubble('Hi! I can help you find campus events. Ask me anything, or try a shortcut.');
      choices(['Recommend something for me', 'Show upcoming events']);
      return;
    }

    bubble('Thinking...', 'bot-thinking');
    
    try {
      const res = await fetch('http://localhost:5000/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      
      const thinkingNodes = document.querySelectorAll('.bot-thinking');
      thinkingNodes.forEach(n => n.remove());

      if (res.ok && data.answer) {
        bubble(data.answer);
      } else {
        fallbackAnswer(q, text);
      }
    } catch (e) {
      const thinkingNodes = document.querySelectorAll('.bot-thinking');
      thinkingNodes.forEach(n => n.remove());
      fallbackAnswer(q, text);
    }
  }

  function fallbackAnswer(q, originalText) {
    const allEvents = events.filter(e => e.status === 'published' && e.event_date >= new Date().toISOString().slice(0,10));
    const activePrograms = (typeof campusPrograms !== 'undefined' ? campusPrograms : []).filter(p => p.status === 'published');
    
    if (/program|club|cohort|ongoing|learn|join/.test(q)) {
      if (!activePrograms.length) {
        bubble('There aren’t any published programs yet.');
        choices(['Show upcoming events']);
        return;
      }
      const matched = activePrograms.map(p => ({
        p, 
        s: ([p.title, p.category, p.description, p.schedule].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && q.includes(w)).length) + (interests.includes(p.category) ? 1 : 0)
      })).sort((a,b) => b.s - a.s).slice(0,3).map(x => x.p);
      bubble('Here are a few campus programs: (AI Unavailable)');
      showMatches(matched, 'program');
      return;
    }
    
    const wantsAll = /upcoming|all events|what.s happening|this week|calendar/.test(q);
    const wantsRecommendations = /recommend|for me|my interests|suggest/.test(q);
    const ranked = allEvents.map(e => {
      const hay = [e.title, e.category, e.description, e.venue].join(' ').toLowerCase();
      const words = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);
      const termScore = words.reduce((n,w) => n + (hay.includes(w) ? 2 : 0), 0);
      const interestScore = (typeof score === 'function' ? score(e) : 0);
      return { event: e, score: wantsAll ? 1 : termScore + (wantsRecommendations ? interestScore : Math.min(interestScore, 2)) };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score || a.event.event_date.localeCompare(b.event.event_date)).slice(0,3).map(x => x.event);
    
    if (ranked.length) {
      bubble(wantsAll ? 'Here are some upcoming events: (AI Unavailable)' : wantsRecommendations ? 'Based on your interests, these look like a good fit: (AI Unavailable)' : 'These events look like a match: (AI Unavailable)');
      showMatches(ranked, 'event');
    } else {
      bubble('I couldn’t find a close match. (AI Unavailable)');
      choices(['Recommend something for me', 'Show upcoming events']);
    }
  }
  
  document.getElementById('chatLauncher').onclick = () => {
    panel.hidden = false;
    if (!messages.childElementCount) {
      bubble('Hey! I’m your campus guide powered by AI. Ask me for event recommendations or upcoming events.');
      choices(['Recommend something for me', 'Show upcoming events']);
    }
    input.focus();
  };
  
  document.getElementById('chatClose').onclick = () => panel.hidden = true;
  document.getElementById('chatForm').onsubmit = e => { e.preventDefault(); answer(input.value); };
  input.addEventListener('keydown', e => { if(e.key === 'Escape') panel.hidden = true; });
})();
