// Program management extension for the demo organizer studio.
let campusPrograms = JSON.parse(localStorage.getItem('campus_programs') || '[]');
const baseRender = render;
render = function () {
  if (view !== 'programs') return baseRender();
  document.getElementById('crumbCurrent').textContent = 'Programs';
  const active = campusPrograms.filter(p => p.status === 'published');
  document.getElementById('viewRoot').innerHTML = `<div class="page-head"><div class="eyebrow">MORE WAYS TO GET INVOLVED</div><h1 class="page-title">Campus programs</h1><p class="page-sub">Ongoing groups, cohorts, and opportunities to learn and build together.</p></div><div class="event-grid">${active.map(p => `<article class="event-card"><div class="event-art art-${(p.category||'default').toLowerCase()}" data-mark="✦"><span class="art-symbol">✦</span></div><div class="event-info"><span class="tag">${p.category}</span><h3>${p.title}</h3><p>${p.description}</p><div class="event-bottom"><span>${p.schedule||'Ongoing'}</span><span>${p.venue||'Campus'}</span></div></div></article>`).join('') || '<div class="empty"><strong>No programs published yet.</strong>Check back soon for ongoing campus opportunities.</div>'}</div>`;
};
const baseAdmin = renderAdmin;
renderAdmin = function (root) {
  baseAdmin(root);
  const panel = document.createElement('div');
  panel.className = 'admin-panel';
  panel.innerHTML = `<h2 style="font:700 16px var(--serif);margin:0 0 17px">Add a campus program</h2><form id="programForm"><div class="form-grid"><div class="field"><label>PROGRAM NAME</label><input name="title" required placeholder="e.g. Student Startup Incubator"></div><div class="field"><label>CATEGORY</label><select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></div><div class="field"><label>FORMAT / SCHEDULE</label><input name="schedule" placeholder="Weekly · Tuesdays"></div><div class="field"><label>LOCATION</label><input name="venue" placeholder="Student Center"></div><div class="field full"><label>ABOUT THE PROGRAM</label><textarea name="description" required placeholder="Who is it for and what will participants do?"></textarea></div></div><div class="form-actions"><button class="button">Add program →</button></div></form><div class="section-head"><div><h2>Programs you manage</h2><p>${campusPrograms.length} total</p></div></div><div>${campusPrograms.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #e9ece9"><span><strong>${p.title}</strong> · ${p.status}</span><button class="text-button" type="button" onclick="toggleProgramStatus('${p.id}')">${p.status==='published'?'Unpublish':'Publish'}</button></div>`).join('') || '<p class="page-sub">Your new programs will appear here.</p>'}</div>`;
  root.insertBefore(panel, root.children[2] || null);
  panel.querySelector('#programForm').onsubmit = e => {
    e.preventDefault();
    campusPrograms.unshift({...Object.fromEntries(new FormData(e.target)), id:'p'+Date.now(), status:'published'});
    localStorage.setItem('campus_programs', JSON.stringify(campusPrograms));
    toast('Program added and published'); render();
  };
};
function toggleProgramStatus(id) {
  const program = campusPrograms.find(p => p.id === id);
  if (!program) return;
  program.status = program.status === 'published' ? 'draft' : 'published';
  localStorage.setItem('campus_programs', JSON.stringify(campusPrograms));
  render();
}
document.querySelectorAll('.nav-item').forEach(button => {
  if (button.dataset.view === 'programs') button.onclick = () => setView('programs');
});
