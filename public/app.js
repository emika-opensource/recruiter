/* ============================================================
   Recruiter — Emika AI Employee
   Single-page application (vanilla JS)
   ============================================================ */

// --- State ---
const state = {
  page: 'dashboard',
  projects: [],
  candidates: [],
  integrations: [],
  scoring: { weights: { skillsMatch: 8, experience: 7, education: 5, cultureFit: 6, communication: 5 } },
  settings: {},
  activity: [],
  dashboard: {},
  onboardingComplete: false,
  onboarding: { step: 0, roles: [], profiles: {}, stages: ['Sourced','Screening','Phone Screen','Technical','Culture Fit','Offer','Hired'] }
};

// --- API Helpers ---
async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (url.includes('/export') && res.ok) {
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'candidates.csv';
    a.click();
    return;
  }
  return res.json();
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function scoreClass(s) {
  if (s === null || s === undefined) return 'score-none';
  if (s >= 80) return 'score-high';
  if (s >= 60) return 'score-mid';
  return 'score-low';
}

function scoreBadge(s) {
  if (s === null || s === undefined) return '<span class="score-badge score-none">--</span>';
  return `<span class="score-badge ${scoreClass(s)}">${s}</span>`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function daysInStage(candidate) {
  if (!candidate.stageHistory || !candidate.stageHistory.length) return 0;
  const last = candidate.stageHistory[candidate.stageHistory.length - 1];
  return Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// --- Data Loading ---
async function loadAll() {
  const [settings, projects, candidates, integrations, scoring, dashboard, activity] = await Promise.all([
    api('/api/settings'),
    api('/api/projects'),
    api('/api/candidates'),
    api('/api/integrations'),
    api('/api/scoring'),
    api('/api/dashboard'),
    api('/api/activity?limit=50')
  ]);
  state.settings = settings;
  state.projects = projects;
  state.candidates = candidates;
  state.integrations = integrations;
  state.scoring = scoring;
  state.dashboard = dashboard;
  state.activity = activity;
  state.onboardingComplete = !!settings.onboardingComplete;
}

// --- Router ---
function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  render();
}

window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1) || 'dashboard';
  navigate(page);
});

document.addEventListener('click', e => {
  const nav = e.target.closest('.nav-item');
  if (nav) {
    e.preventDefault();
    location.hash = nav.dataset.page;
  }
});

// --- Modal ---
function showModal(html, cls = '') {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal ${cls}">${html}</div>`;
  overlay.classList.remove('hidden');
  overlay.onclick = e => { if (e.target === overlay) closeModal(); };
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// --- Tag Input Helper ---
function createTagInput(id, tags = [], placeholder = 'Type and press Enter') {
  return `<div class="tag-input-wrap" data-tags="${id}">
    ${tags.map(t => `<span class="tag">${esc(t)}<span class="tag-remove" data-tag="${esc(t)}">&times;</span></span>`).join('')}
    <input class="tag-input" placeholder="${placeholder}" data-tag-input="${id}">
  </div>`;
}

function getTagsFromWrap(container) {
  return Array.from(container.querySelectorAll('.tag')).map(t => t.textContent.replace('×', '').trim());
}

function initTagInputs(el) {
  el.querySelectorAll('.tag-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        const wrap = input.closest('.tag-input-wrap');
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${esc(input.value.trim())}<span class="tag-remove">&times;</span>`;
        wrap.insertBefore(tag, input);
        input.value = '';
      }
    });
  });
  el.addEventListener('click', e => {
    if (e.target.classList.contains('tag-remove')) {
      e.target.closest('.tag').remove();
    }
    if (e.target.classList.contains('tag-input-wrap')) {
      e.target.querySelector('.tag-input')?.focus();
    }
  });
}

// ============================================================
// ONBOARDING
// ============================================================
function renderOnboarding() {
  const app = document.getElementById('app');
  app.classList.add('onboarding-active');
  const steps = 7;
  const s = state.onboarding;
  const pc = document.getElementById('page-content');

  const dots = Array.from({ length: steps }, (_, i) =>
    `<div class="onboarding-step-dot ${i < s.step ? 'done' : ''} ${i === s.step ? 'active' : ''}"></div>`
  ).join('');

  let content = '';

  if (s.step === 0) {
    // Welcome
    content = `
      <div class="onboarding-title">Let's set up your hiring pipeline</div>
      <div class="onboarding-subtitle">We'll walk you through configuring roles, scoring criteria, pipeline stages, and integrations. It only takes a few minutes.</div>
      <div style="display:flex;gap:16px;margin-top:20px;">
        <div class="stat-card" style="flex:1;text-align:center;">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="12" r="6" stroke="var(--accent)" stroke-width="2"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>
          <div style="margin-top:8px;font-weight:600;">Define Roles</div>
          <div style="font-size:12px;color:var(--text-dim);">What positions are you hiring for?</div>
        </div>
        <div class="stat-card" style="flex:1;text-align:center;">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4l4 8 8 1.2-6 5.8 1.5 8L16 22.5 8.5 27 10 19l-6-5.8 8-1.2z" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/></svg>
          <div style="margin-top:8px;font-weight:600;">Set Criteria</div>
          <div style="font-size:12px;color:var(--text-dim);">How do you evaluate candidates?</div>
        </div>
        <div class="stat-card" style="flex:1;text-align:center;">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="6" height="20" rx="1.5" stroke="var(--accent)" stroke-width="2"/><rect x="13" y="10" width="6" height="16" rx="1.5" stroke="var(--accent)" stroke-width="2"/><rect x="22" y="14" width="6" height="12" rx="1.5" stroke="var(--accent)" stroke-width="2"/></svg>
          <div style="margin-top:8px;font-weight:600;">Build Pipeline</div>
          <div style="font-size:12px;color:var(--text-dim);">Customize your hiring stages</div>
        </div>
      </div>
      <div class="onboarding-actions">
        <div></div>
        <button class="btn btn-primary" onclick="nextOnboarding()">Get Started</button>
      </div>`;
  } else if (s.step === 1) {
    // Roles
    content = `
      <div class="onboarding-title">Step 1: Define Your Roles</div>
      <div class="onboarding-subtitle">Add the positions you're currently hiring for. You can always add more later.</div>
      <div class="role-chips" id="onb-roles">
        ${s.roles.map((r, i) => `
          <div class="role-chip">
            <div class="role-chip-info">
              <div class="role-chip-title">${esc(r.title)}</div>
              <div class="role-chip-meta">${esc(r.department)} / ${esc(r.level)} / ${esc(r.location)} / ${esc(r.workType)}</div>
            </div>
            <button class="btn btn-sm btn-danger btn-ghost" onclick="removeOnbRole(${i})">Remove</button>
          </div>`).join('')}
      </div>
      <div class="card" style="padding:16px;">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Job Title</label><input class="input" id="onb-role-title" placeholder="e.g. Senior Frontend Engineer"></div>
          <div class="form-group"><label class="form-label">Department</label><input class="input" id="onb-role-dept" placeholder="e.g. Engineering"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Level</label>
            <select class="select-styled" id="onb-role-level">
              <option value="junior">Junior</option><option value="mid">Mid</option><option value="senior" selected>Senior</option><option value="lead">Lead</option><option value="manager">Manager</option><option value="director">Director</option><option value="vp">VP</option><option value="c-level">C-Level</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Location</label><input class="input" id="onb-role-loc" placeholder="e.g. San Francisco, CA"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Work Type</label>
            <select class="select-styled" id="onb-role-worktype">
              <option value="onsite">Onsite</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Salary Range</label>
            <div style="display:flex;gap:8px;"><input class="input" id="onb-role-salmin" placeholder="Min"><input class="input" id="onb-role-salmax" placeholder="Max"></div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Required Skills</label>${createTagInput('onb-req-skills', [], 'Add skill and press Enter')}</div>
        <div class="form-group"><label class="form-label">Nice-to-Have Skills</label>${createTagInput('onb-nice-skills', [], 'Add skill and press Enter')}</div>
        <button class="btn btn-primary" onclick="addOnbRole()" style="margin-top:8px;">Add Role</button>
      </div>
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn btn-primary" onclick="nextOnboarding()" ${s.roles.length === 0 ? 'disabled' : ''}>Next: Candidate Profiles</button>
      </div>`;
  } else if (s.step === 2) {
    // Ideal Candidate Profile
    const role = s.roles[0] || {};
    content = `
      <div class="onboarding-title">Step 2: Ideal Candidate Profile</div>
      <div class="onboarding-subtitle">Define what makes a great candidate for each role. Starting with: <strong>${esc(role.title || 'Role')}</strong></div>
      ${s.roles.map((r, i) => {
        const p = s.profiles[i] || {};
        return `
        <div class="card mb-12" style="padding:16px;">
          <div style="font-weight:600;margin-bottom:10px;">${esc(r.title)}</div>
          <div class="form-group"><label class="form-label">Must-Have Qualifications</label>${createTagInput(`onb-musthave-${i}`, p.mustHave || [], 'e.g. 5+ years React')}</div>
          <div class="form-group"><label class="form-label">Deal-Breakers</label>${createTagInput(`onb-dealbreak-${i}`, p.dealBreakers || [], 'e.g. No remote experience')}</div>
          <div class="form-group"><label class="form-label">Culture Fit Criteria</label>${createTagInput(`onb-culture-${i}`, p.cultureFit || [], 'e.g. Team player, Self-starter')}</div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Experience Level</label>
              <select class="select-styled" data-exp="${i}">
                <option value="junior" ${p.experience==='junior'?'selected':''}>Junior (0-2 years)</option>
                <option value="mid" ${p.experience==='mid'?'selected':''}>Mid (3-5 years)</option>
                <option value="senior" ${(!p.experience||p.experience==='senior')?'selected':''}>Senior (5+ years)</option>
                <option value="lead" ${p.experience==='lead'?'selected':''}>Lead (7+ years)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Education Preference</label>
              <select class="select-styled" data-edu="${i}">
                <option value="none" ${p.education==='none'?'selected':''}>No preference</option>
                <option value="bachelors" ${(!p.education||p.education==='bachelors')?'selected':''}>Bachelor's degree</option>
                <option value="masters" ${p.education==='masters'?'selected':''}>Master's degree</option>
                <option value="phd" ${p.education==='phd'?'selected':''}>PhD</option>
              </select>
            </div>
          </div>
        </div>`;
      }).join('')}
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn btn-primary" onclick="saveOnbProfiles(); nextOnboarding()">Next: Scoring Criteria</button>
      </div>`;
  } else if (s.step === 3) {
    // Scoring Criteria
    const w = state.scoring.weights;
    content = `
      <div class="onboarding-title">Step 3: Scoring Criteria</div>
      <div class="onboarding-subtitle">Set the importance weight (1-10) for each scoring factor. Higher weight means more influence on the final score.</div>
      <div class="card" style="padding:20px;">
        ${Object.entries(w).map(([key, val]) => {
          const labels = { skillsMatch: 'Skills Match', experience: 'Experience', education: 'Education', cultureFit: 'Culture Fit', communication: 'Communication' };
          return `<div class="weight-row">
            <div class="weight-label">${labels[key] || key}</div>
            <input type="range" class="weight-slider" min="1" max="10" value="${val}" data-weight="${key}">
            <div class="weight-value" id="wv-${key}">${val}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn btn-primary" onclick="saveOnbWeights(); nextOnboarding()">Next: Pipeline Stages</button>
      </div>`;
  } else if (s.step === 4) {
    // Pipeline Stages
    content = `
      <div class="onboarding-title">Step 4: Pipeline Stages</div>
      <div class="onboarding-subtitle">Customize your hiring pipeline stages. Drag to reorder, or add/remove stages.</div>
      <div class="card" style="padding:20px;">
        <div id="onb-stages" style="display:flex;flex-direction:column;gap:6px;">
          ${s.stages.map((st, i) => `
            <div class="role-chip" draggable="true" data-stage-idx="${i}">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:0.4;cursor:grab;"><path d="M4 3h1M4 7h1M4 11h1M9 3h1M9 7h1M9 11h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span>${esc(st)}</span>
              </div>
              <button class="btn btn-sm btn-ghost btn-danger" onclick="removeOnbStage(${i})">Remove</button>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <input class="input" id="onb-new-stage" placeholder="New stage name" style="flex:1;">
          <button class="btn btn-primary btn-sm" onclick="addOnbStage()">Add Stage</button>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-dim);">
          Note: "Rejected" is always available as a side-stage and does not need to be added here.
        </div>
      </div>
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn btn-primary" onclick="nextOnboarding()">Next: Integrations</button>
      </div>`;
  } else if (s.step === 5) {
    // Integrations
    const platforms = [
      { id: 'greenhouse', name: 'Greenhouse', type: 'API', fields: ['apiKey'] },
      { id: 'lever', name: 'Lever', type: 'API', fields: ['apiKey'] },
      { id: 'workable', name: 'Workable', type: 'API', fields: ['apiKey', 'subdomain'] },
      { id: 'bamboohr', name: 'BambooHR', type: 'API', fields: ['apiKey', 'subdomain'] },
      { id: 'ashby', name: 'Ashby', type: 'API', fields: ['apiKey'] },
      { id: 'smartrecruiters', name: 'SmartRecruiters', type: 'API', fields: ['apiKey'] },
      { id: 'linkedin', name: 'LinkedIn Jobs', type: 'BrowserBase', fields: [] },
      { id: 'indeed', name: 'Indeed', type: 'BrowserBase', fields: [] },
      { id: 'glassdoor', name: 'Glassdoor', type: 'BrowserBase', fields: [] },
      { id: 'angellist', name: 'AngelList / Wellfound', type: 'BrowserBase', fields: [] }
    ];
    content = `
      <div class="onboarding-title">Step 5: Connect Integrations</div>
      <div class="onboarding-subtitle">Optionally connect your hiring platforms. You can skip this and configure later.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${platforms.map(p => `
          <div class="card" style="padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div>
                <div style="font-weight:600;font-size:13px;">${p.name}</div>
                <div style="font-size:11px;color:var(--text-muted);">${p.type} Integration</div>
              </div>
            </div>
            ${p.fields.includes('apiKey') ? `<div class="form-group"><label class="form-label">API Key</label><input class="input" data-integ-key="${p.id}" placeholder="Enter API key"></div>` : ''}
            ${p.fields.includes('subdomain') ? `<div class="form-group"><label class="form-label">Subdomain</label><input class="input" data-integ-sub="${p.id}" placeholder="your-company"></div>` : ''}
            ${p.type === 'BrowserBase' ? `<div style="font-size:11px;color:var(--text-muted);">Requires BROWSERBASE_API_KEY env var</div>` : ''}
          </div>`).join('')}
      </div>
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn" onclick="nextOnboarding()">Skip</button>
        <button class="btn btn-primary" onclick="saveOnbIntegrations(); nextOnboarding()">Save & Continue</button>
      </div>`;
  } else if (s.step === 6) {
    // Review & Launch
    content = `
      <div class="onboarding-title">Review & Launch</div>
      <div class="onboarding-subtitle">Here's a summary of your setup. Click "Launch Pipeline" to get started.</div>
      <div class="card mb-12" style="padding:16px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Roles (${s.roles.length})</h3>
        ${s.roles.map(r => `<div style="padding:4px 0;font-size:13px;"><strong>${esc(r.title)}</strong> — ${esc(r.department)} / ${esc(r.level)}</div>`).join('')}
      </div>
      <div class="card mb-12" style="padding:16px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Pipeline Stages</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${s.stages.map(st => `<span class="badge badge-accent">${esc(st)}</span>`).join(' → ')}
          <span class="badge badge-red">Rejected</span>
        </div>
      </div>
      <div class="card mb-12" style="padding:16px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Scoring Weights</h3>
        ${Object.entries(state.scoring.weights).map(([k, v]) => {
          const labels = { skillsMatch: 'Skills Match', experience: 'Experience', education: 'Education', cultureFit: 'Culture Fit', communication: 'Communication' };
          return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;"><span>${labels[k] || k}</span><span class="text-accent" style="font-weight:600;">${v}/10</span></div>`;
        }).join('')}
      </div>
      <div class="onboarding-actions">
        <button class="btn" onclick="prevOnboarding()">Back</button>
        <button class="btn btn-primary" onclick="finishOnboarding()">Launch Pipeline</button>
      </div>`;
  }

  pc.innerHTML = `<div class="onboarding-wrap"><div class="onboarding-container">
    <div class="onboarding-steps">${dots}</div>
    ${content}
  </div></div>`;

  initTagInputs(pc);
  initWeightSliders(pc);
  initStageDrag();
}

function initWeightSliders(el) {
  el.querySelectorAll('.weight-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.weight;
      const val = Number(slider.value);
      state.scoring.weights[key] = val;
      const display = document.getElementById(`wv-${key}`);
      if (display) display.textContent = val;
    });
  });
}

function initStageDrag() {
  const container = document.getElementById('onb-stages');
  if (!container) return;
  let dragIdx = null;
  container.querySelectorAll('[draggable]').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragIdx = Number(el.dataset.stageIdx);
      el.style.opacity = '0.5';
    });
    el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', e => { e.preventDefault(); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = Number(el.dataset.stageIdx);
      if (dragIdx !== null && dragIdx !== targetIdx) {
        const item = state.onboarding.stages.splice(dragIdx, 1)[0];
        state.onboarding.stages.splice(targetIdx, 0, item);
        renderOnboarding();
      }
    });
  });
}

window.addOnbRole = function() {
  const title = document.getElementById('onb-role-title').value.trim();
  if (!title) return toast('Please enter a job title', 'error');
  const reqSkillsWrap = document.querySelector('[data-tags="onb-req-skills"]');
  const niceSkillsWrap = document.querySelector('[data-tags="onb-nice-skills"]');
  state.onboarding.roles.push({
    title,
    department: document.getElementById('onb-role-dept').value.trim(),
    level: document.getElementById('onb-role-level').value,
    location: document.getElementById('onb-role-loc').value.trim(),
    workType: document.getElementById('onb-role-worktype').value,
    salaryMin: document.getElementById('onb-role-salmin').value.trim(),
    salaryMax: document.getElementById('onb-role-salmax').value.trim(),
    requiredSkills: reqSkillsWrap ? getTagsFromWrap(reqSkillsWrap) : [],
    niceToHaveSkills: niceSkillsWrap ? getTagsFromWrap(niceSkillsWrap) : []
  });
  renderOnboarding();
};

window.removeOnbRole = function(i) {
  state.onboarding.roles.splice(i, 1);
  renderOnboarding();
};

window.removeOnbStage = function(i) {
  state.onboarding.stages.splice(i, 1);
  renderOnboarding();
};

window.addOnbStage = function() {
  const input = document.getElementById('onb-new-stage');
  const v = input.value.trim();
  if (!v) return;
  state.onboarding.stages.push(v);
  renderOnboarding();
};

window.saveOnbProfiles = function() {
  state.onboarding.roles.forEach((r, i) => {
    const mustWrap = document.querySelector(`[data-tags="onb-musthave-${i}"]`);
    const dealWrap = document.querySelector(`[data-tags="onb-dealbreak-${i}"]`);
    const cultureWrap = document.querySelector(`[data-tags="onb-culture-${i}"]`);
    const expSel = document.querySelector(`[data-exp="${i}"]`);
    const eduSel = document.querySelector(`[data-edu="${i}"]`);
    state.onboarding.profiles[i] = {
      mustHave: mustWrap ? getTagsFromWrap(mustWrap) : [],
      dealBreakers: dealWrap ? getTagsFromWrap(dealWrap) : [],
      cultureFit: cultureWrap ? getTagsFromWrap(cultureWrap) : [],
      experience: expSel ? expSel.value : 'senior',
      education: eduSel ? eduSel.value : 'bachelors'
    };
  });
};

window.saveOnbWeights = function() {
  // Already saved via slider input events
};

window.saveOnbIntegrations = async function() {
  const platforms = ['greenhouse', 'lever', 'workable', 'bamboohr', 'ashby', 'smartrecruiters'];
  for (const p of platforms) {
    const keyInput = document.querySelector(`[data-integ-key="${p}"]`);
    const subInput = document.querySelector(`[data-integ-sub="${p}"]`);
    if (keyInput && keyInput.value.trim()) {
      await api('/api/integrations', { method: 'POST', body: {
        platform: p,
        apiKey: keyInput.value.trim(),
        subdomain: subInput ? subInput.value.trim() : ''
      }});
    }
  }
};

window.nextOnboarding = function() {
  if (state.onboarding.step < 6) {
    state.onboarding.step++;
    renderOnboarding();
  }
};
window.prevOnboarding = function() {
  if (state.onboarding.step > 0) {
    state.onboarding.step--;
    renderOnboarding();
  }
};

window.finishOnboarding = async function() {
  // Create projects from roles
  for (let i = 0; i < state.onboarding.roles.length; i++) {
    const r = state.onboarding.roles[i];
    const p = state.onboarding.profiles[i] || {};
    await api('/api/projects', { method: 'POST', body: {
      title: r.title,
      department: r.department,
      level: r.level,
      location: r.location,
      workType: r.workType,
      salaryMin: r.salaryMin,
      salaryMax: r.salaryMax,
      requiredSkills: r.requiredSkills,
      niceToHaveSkills: r.niceToHaveSkills,
      mustHaveQualifications: p.mustHave || [],
      dealBreakers: p.dealBreakers || [],
      cultureFitCriteria: p.cultureFit || [],
      experienceLevel: p.experience || 'senior',
      educationPreference: p.education || 'bachelors',
      pipelineStages: state.onboarding.stages,
      status: 'open'
    }});
  }
  // Save scoring
  await api('/api/scoring', { method: 'PUT', body: state.scoring });
  // Mark complete
  await api('/api/onboarding/complete', { method: 'POST' });
  state.onboardingComplete = true;
  document.getElementById('app').classList.remove('onboarding-active');
  await loadAll();
  navigate('dashboard');
  toast('Pipeline launched! Welcome to Recruiter.');
};

// ============================================================
// PAGES
// ============================================================

function render() {
  if (!state.onboardingComplete) return renderOnboarding();
  const pages = { dashboard: renderDashboard, pipeline: renderPipeline, candidates: renderCandidates, projects: renderProjects, integrations: renderIntegrations, scoring: renderScoring, reports: renderReports, settings: renderSettings };
  const fn = pages[state.page] || renderDashboard;
  fn();
}

// --- DASHBOARD ---
function renderDashboard() {
  const d = state.dashboard;
  const pc = document.getElementById('page-content');
  const stages = d.stageDistribution || {};
  const maxStage = Math.max(1, ...Object.values(stages));

  pc.innerHTML = `
    <div class="page-header"><h1>Dashboard</h1></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value text-accent">${d.activeRoles || 0}</div><div class="stat-label">Active Roles</div></div>
      <div class="stat-card"><div class="stat-value">${d.totalCandidates || 0}</div><div class="stat-label">Total Candidates</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--yellow)">${d.unscored || 0}</div><div class="stat-label">Unscored Candidates</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${Object.keys(stages).length}</div><div class="stat-label">Pipeline Stages Active</div></div>
    </div>
    <div style="padding:20px 28px;">
      <div class="grid-2">
        <div class="card" style="padding:18px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Candidates by Stage</h3>
          <div class="bar-chart">
            ${Object.entries(stages).map(([stage, count]) => `
              <div class="bar-col">
                <div class="bar-value">${count}</div>
                <div class="bar-fill" style="height:${(count / maxStage) * 100}%"></div>
                <div class="bar-label">${esc(stage)}</div>
              </div>`).join('')}
            ${Object.keys(stages).length === 0 ? '<div class="empty-state" style="padding:20px;"><p>No candidates yet</p></div>' : ''}
          </div>
        </div>
        <div class="card" style="padding:18px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Recent Activity</h3>
          <div style="max-height:200px;overflow-y:auto;">
            ${(d.recentActivity || []).slice(0, 10).map(a => `
              <div class="activity-item">
                <div class="activity-dot"></div>
                <div style="flex:1;">
                  <div>${formatActivity(a)}</div>
                  <div class="activity-time">${timeAgo(a.timestamp)}</div>
                </div>
              </div>`).join('')}
            ${(!d.recentActivity || d.recentActivity.length === 0) ? '<div class="text-muted" style="padding:10px;font-size:12px;">No activity yet</div>' : ''}
          </div>
        </div>
      </div>
    </div>
    ${d.integrationStatus && d.integrationStatus.length ? `
    <div class="section-pad">
      <div class="card" style="padding:18px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Integration Status</h3>
        ${d.integrationStatus.map(i => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);">
            <span style="font-weight:500;">${esc(i.platform)}</span>
            <span class="badge ${i.syncStatus === 'synced' ? 'badge-green' : i.syncStatus === 'error' ? 'badge-red' : 'badge-yellow'}">${i.syncStatus}${i.lastSync ? ' - ' + timeAgo(i.lastSync) : ''}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

function formatActivity(a) {
  const d = a.details || {};
  const actions = {
    candidate_added: `Added candidate <strong>${esc(d.name || '')}</strong>`,
    candidate_scored: `Scored <strong>${esc(d.name || '')}</strong> — ${d.score}`,
    stage_change: `<strong>${esc(d.name || '')}</strong> moved from ${esc(d.from || '')} to <strong>${esc(d.to || '')}</strong>`,
    project_created: `Created role <strong>${esc(d.title || '')}</strong>`,
    project_deleted: `Deleted role <strong>${esc(d.title || '')}</strong>`,
    candidates_imported: `Imported ${d.count} candidates`,
    batch_score: `Batch scored ${d.scored} candidates`,
    integration_configured: `Configured ${esc(d.platform || '')} integration`,
    integration_synced: `Synced ${esc(d.platform || '')}`,
    onboarding_complete: `Onboarding completed`
  };
  return actions[a.action] || a.action;
}

// --- PIPELINE (Kanban) ---
function renderPipeline() {
  const pc = document.getElementById('page-content');
  const projectOptions = state.projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  const selectedProject = state._pipelineProject || (state.projects[0] && state.projects[0].id) || '';
  const project = state.projects.find(p => p.id === selectedProject);
  const stages = project ? [...(project.pipelineStages || []), 'Rejected'] : ['Sourced', 'Screening', 'Phone Screen', 'Technical', 'Culture Fit', 'Offer', 'Hired', 'Rejected'];
  const candidates = state.candidates.filter(c => c.projectId === selectedProject);

  pc.innerHTML = `
    <div class="page-header">
      <h1>Pipeline</h1>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="showAddCandidateModal('${selectedProject}')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add Candidate
        </button>
      </div>
    </div>
    <div class="pipeline-selector">
      <label class="form-label" style="margin:0;">Role:</label>
      <select class="select-styled" style="width:260px;" onchange="state._pipelineProject=this.value; renderPipeline()">
        ${!selectedProject ? '<option value="">Select a role</option>' : ''}
        ${projectOptions}
      </select>
      <button class="btn btn-sm" onclick="filterPipelineModal()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2h12M3 7h8M5 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Filter
      </button>
    </div>
    <div class="kanban-container">
      ${stages.map(stage => {
        const items = candidates.filter(c => c.stage === stage);
        return `
          <div class="kanban-column" data-stage="${esc(stage)}">
            <div class="kanban-column-header">
              <span>${esc(stage)}</span>
              <span class="count">${items.length}</span>
            </div>
            <div class="kanban-column-body" data-drop-stage="${esc(stage)}"
                 ondragover="event.preventDefault(); this.classList.add('drag-over')"
                 ondragleave="this.classList.remove('drag-over')"
                 ondrop="handleKanbanDrop(event, '${esc(stage)}')">
              ${items.map(c => `
                <div class="kanban-card" draggable="true" data-candidate-id="${c.id}"
                     ondragstart="event.dataTransfer.setData('text/plain','${c.id}'); this.classList.add('dragging')"
                     ondragend="this.classList.remove('dragging')"
                     onclick="showCandidateDetail('${c.id}')">
                  <div class="kanban-card-name">${esc(c.name)}</div>
                  <div class="kanban-card-role">${esc(c.role || project?.title || '')}</div>
                  <div class="kanban-card-footer">
                    <span>${esc(c.source || '')}</span>
                    ${scoreBadge(c.score)}
                    <span>${daysInStage(c)}d</span>
                  </div>
                </div>`).join('')}
              ${items.length === 0 ? '<div style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted);">Drop here</div>' : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

window.handleKanbanDrop = async function(event, stage) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const candidateId = event.dataTransfer.getData('text/plain');
  if (!candidateId) return;
  await api(`/api/candidates/${candidateId}/stage`, { method: 'PUT', body: { stage } });
  await loadAll();
  renderPipeline();
  toast(`Moved to ${stage}`);
};

// --- CANDIDATES ---
function renderCandidates() {
  const pc = document.getElementById('page-content');
  const candidates = state.candidates;
  const projectOptions = state.projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');

  pc.innerHTML = `
    <div class="page-header">
      <h1>Candidates</h1>
      <div class="page-header-actions">
        <button class="btn" onclick="showBulkScoreModal()">Score Unscored</button>
        <button class="btn" onclick="exportCandidates()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M3 7l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Export CSV
        </button>
        <button class="btn btn-primary" onclick="showAddCandidateModal()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add Candidate
        </button>
      </div>
    </div>
    <div class="filter-bar">
      <input class="input" placeholder="Search candidates..." oninput="filterCandidates(this.value)" id="cand-search">
      <select class="select-styled" onchange="filterCandidatesByProject(this.value)" id="cand-proj-filter">
        <option value="">All Roles</option>
        ${projectOptions}
      </select>
      <select class="select-styled" onchange="filterCandidatesByStage(this.value)" id="cand-stage-filter">
        <option value="">All Stages</option>
        ${[...new Set(candidates.map(c => c.stage))].map(s => `<option value="${s}">${esc(s)}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Stage</th>
            <th>Score</th>
            <th>Source</th>
            <th>Days</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="candidates-tbody">
          ${candidates.map(c => candidateRow(c)).join('')}
        </tbody>
      </table>
      ${candidates.length === 0 ? '<div class="empty-state"><p>No candidates yet. Add your first candidate or import from a platform.</p></div>' : ''}
    </div>`;
}

function candidateRow(c) {
  const project = state.projects.find(p => p.id === c.projectId);
  return `<tr class="clickable" onclick="showCandidateDetail('${c.id}')">
    <td style="font-weight:500;">${esc(c.name)}</td>
    <td>${esc(c.role || project?.title || '')}</td>
    <td><span class="badge badge-accent">${esc(c.stage)}</span></td>
    <td>${scoreBadge(c.score)}</td>
    <td class="text-dim">${esc(c.source || '')}</td>
    <td class="text-dim">${daysInStage(c)}</td>
    <td class="text-dim">${timeAgo(c.createdAt)}</td>
    <td>
      <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); deleteCandidate('${c.id}')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2h4v2M4 4v8h6V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </td>
  </tr>`;
}

window.filterCandidates = function(search) {
  const s = search.toLowerCase();
  const tbody = document.getElementById('candidates-tbody');
  let filtered = state.candidates;
  if (s) filtered = filtered.filter(c => (c.name + ' ' + c.email + ' ' + c.role).toLowerCase().includes(s));
  const projFilter = document.getElementById('cand-proj-filter')?.value;
  if (projFilter) filtered = filtered.filter(c => c.projectId === projFilter);
  const stageFilter = document.getElementById('cand-stage-filter')?.value;
  if (stageFilter) filtered = filtered.filter(c => c.stage === stageFilter);
  tbody.innerHTML = filtered.map(c => candidateRow(c)).join('');
};
window.filterCandidatesByProject = () => window.filterCandidates(document.getElementById('cand-search')?.value || '');
window.filterCandidatesByStage = () => window.filterCandidates(document.getElementById('cand-search')?.value || '');

window.exportCandidates = function() {
  const projFilter = document.getElementById('cand-proj-filter')?.value;
  const url = projFilter ? `/api/candidates/export?projectId=${projFilter}` : '/api/candidates/export';
  window.open(url, '_blank');
};

// --- Candidate Detail Modal ---
window.showCandidateDetail = function(id) {
  const c = state.candidates.find(x => x.id === id);
  if (!c) return;
  const project = state.projects.find(p => p.id === c.projectId);
  const stages = project ? [...(project.pipelineStages || []), 'Rejected'] : ['Sourced', 'Screening', 'Phone Screen', 'Technical', 'Culture Fit', 'Offer', 'Hired', 'Rejected'];

  let breakdownHtml = '';
  if (c.scoreBreakdown) {
    const labels = { skillsMatch: 'Skills Match', experience: 'Experience', education: 'Education', cultureFit: 'Culture Fit', communication: 'Communication' };
    breakdownHtml = `<div class="score-breakdown">
      ${Object.entries(c.scoreBreakdown).map(([key, b]) => {
        const color = b.score >= 80 ? 'var(--green)' : b.score >= 60 ? 'var(--yellow)' : 'var(--red)';
        return `<div class="score-bar-row">
          <div class="score-bar-label">${labels[key] || key}</div>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${b.score}%;background:${color}"></div></div>
          <div class="score-bar-value" style="color:${color}">${b.score}</div>
        </div>`;
      }).join('')}
    </div>
    ${c.scoreReason ? `<div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${esc(c.scoreReason)}</div>` : ''}`;
  }

  showModal(`
    <div style="display:flex;justify-content:space-between;align-items:start;">
      <div>
        <h2 style="margin-bottom:4px;">${esc(c.name)}</h2>
        <div class="text-dim" style="font-size:13px;">${esc(c.role || project?.title || '')} — ${esc(c.stage)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${scoreBadge(c.score)}
        <button class="btn btn-sm" onclick="scoreCandidate('${c.id}')">Score</button>
      </div>
    </div>
    <div style="margin-top:16px;">
      <div class="detail-section">
        <h3>Contact</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
          <div><span class="text-dim">Email:</span> ${esc(c.email || '—')}</div>
          <div><span class="text-dim">Phone:</span> ${esc(c.phone || '—')}</div>
          <div><span class="text-dim">LinkedIn:</span> ${c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" style="color:var(--accent);">Profile</a>` : '—'}</div>
          <div><span class="text-dim">Source:</span> ${esc(c.source || '—')}</div>
        </div>
      </div>
      ${c.scoreBreakdown ? `<div class="detail-section"><h3>Score Breakdown</h3>${breakdownHtml}</div>` : ''}
      <div class="detail-section">
        <h3>Move Stage</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${stages.map(s => `<button class="btn btn-sm ${s === c.stage ? 'btn-primary' : ''}" onclick="moveCandidateStage('${c.id}','${esc(s)}')">${esc(s)}</button>`).join('')}
        </div>
      </div>
      ${c.resumeText ? `<div class="detail-section"><h3>Resume / CV</h3><div style="font-size:12.5px;white-space:pre-wrap;max-height:200px;overflow-y:auto;background:var(--bg-input);padding:10px;border-radius:var(--radius-sm);">${esc(c.resumeText)}</div></div>` : ''}
      ${c.notes ? `<div class="detail-section"><h3>Notes</h3><div style="font-size:12.5px;">${esc(c.notes)}</div></div>` : ''}
      <div class="detail-section">
        <h3>Timeline</h3>
        ${(c.stageHistory || []).slice().reverse().map(h => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
              <div>${h.from ? `${esc(h.from)} → ` : ''}<strong>${esc(h.stage)}</strong></div>
              <div class="text-muted" style="font-size:11px;">${new Date(h.timestamp).toLocaleString()}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="deleteCandidate('${c.id}'); closeModal();">Delete</button>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>
  `, 'modal-lg');
};

window.moveCandidateStage = async function(id, stage) {
  await api(`/api/candidates/${id}/stage`, { method: 'PUT', body: { stage } });
  await loadAll();
  closeModal();
  render();
  toast(`Moved to ${stage}`);
};

window.scoreCandidate = async function(id) {
  await api(`/api/candidates/${id}/score`, { method: 'POST', body: {} });
  await loadAll();
  showCandidateDetail(id);
  toast('Candidate scored');
};

window.deleteCandidate = async function(id) {
  if (!confirm('Delete this candidate?')) return;
  await api(`/api/candidates/${id}`, { method: 'DELETE' });
  await loadAll();
  render();
  toast('Candidate deleted');
};

// --- Add Candidate Modal ---
window.showAddCandidateModal = function(projectId = '') {
  const projectOptions = state.projects.map(p => `<option value="${p.id}" ${p.id === projectId ? 'selected' : ''}>${esc(p.title)}</option>`).join('');
  showModal(`
    <h2>Add Candidate</h2>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name</label><input class="input" id="ac-name"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="input" id="ac-email" type="email"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone</label><input class="input" id="ac-phone"></div>
      <div class="form-group"><label class="form-label">LinkedIn URL</label><input class="input" id="ac-linkedin"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Role / Project</label>
        <select class="select-styled" id="ac-project">${projectOptions}</select>
      </div>
      <div class="form-group"><label class="form-label">Source</label>
        <select class="select-styled" id="ac-source">
          <option value="manual">Manual</option><option value="referral">Referral</option><option value="linkedin">LinkedIn</option><option value="indeed">Indeed</option><option value="greenhouse">Greenhouse</option><option value="other">Other</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Resume / CV Text</label><textarea class="textarea" id="ac-resume" rows="4" placeholder="Paste resume text..."></textarea></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="textarea" id="ac-notes" rows="2"></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddCandidate()">Add Candidate</button>
    </div>
  `);
};

window.submitAddCandidate = async function() {
  const name = document.getElementById('ac-name').value.trim();
  if (!name) return toast('Name is required', 'error');
  const projectId = document.getElementById('ac-project').value;
  const project = state.projects.find(p => p.id === projectId);
  await api('/api/candidates', { method: 'POST', body: {
    name,
    email: document.getElementById('ac-email').value.trim(),
    phone: document.getElementById('ac-phone').value.trim(),
    linkedin: document.getElementById('ac-linkedin').value.trim(),
    projectId,
    role: project ? project.title : '',
    source: document.getElementById('ac-source').value,
    resumeText: document.getElementById('ac-resume').value.trim(),
    notes: document.getElementById('ac-notes').value.trim(),
    stage: project?.pipelineStages?.[0] || 'Sourced'
  }});
  await loadAll();
  closeModal();
  render();
  toast('Candidate added');
};

window.showBulkScoreModal = async function() {
  const unscored = state.candidates.filter(c => c.score === null || c.score === undefined).length;
  if (unscored === 0) return toast('All candidates are already scored');
  if (!confirm(`Score ${unscored} unscored candidates?`)) return;
  const result = await api('/api/candidates/batch-score', { method: 'POST' });
  await loadAll();
  render();
  toast(`Scored ${result.scored} candidates`);
};

// --- PROJECTS ---
function renderProjects() {
  const pc = document.getElementById('page-content');
  pc.innerHTML = `
    <div class="page-header">
      <h1>Projects (Roles)</h1>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="showProjectModal()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          New Role
        </button>
      </div>
    </div>
    <div class="section-pad">
      ${state.projects.length === 0 ? '<div class="empty-state"><p>No roles yet. Create your first hiring role.</p></div>' : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px;">
        ${state.projects.map(p => {
          const cands = state.candidates.filter(c => c.projectId === p.id);
          const stageMap = {};
          cands.forEach(c => { stageMap[c.stage] = (stageMap[c.stage] || 0) + 1; });
          return `
            <div class="card clickable" onclick="showProjectDetail('${p.id}')" style="padding:18px;">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                <div>
                  <div style="font-size:15px;font-weight:600;">${esc(p.title)}</div>
                  <div class="text-dim" style="font-size:12px;">${esc(p.department)} / ${esc(p.level)} / ${esc(p.workType)}</div>
                </div>
                <span class="badge ${p.status === 'open' ? 'badge-green' : 'badge-red'}">${p.status}</span>
              </div>
              <div style="display:flex;gap:16px;font-size:12px;color:var(--text-dim);margin-top:8px;">
                <span>${cands.length} candidates</span>
                <span>${esc(p.location || '—')}</span>
                ${p.salaryMin || p.salaryMax ? `<span>$${p.salaryMin || '?'} - $${p.salaryMax || '?'}</span>` : ''}
              </div>
              ${Object.keys(stageMap).length > 0 ? `
              <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                ${Object.entries(stageMap).map(([s, n]) => `<span class="badge badge-accent" style="font-size:10px;">${esc(s)}: ${n}</span>`).join('')}
              </div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

window.showProjectModal = function(project = null) {
  const p = project || {};
  const isEdit = !!p.id;
  showModal(`
    <h2>${isEdit ? 'Edit' : 'New'} Role</h2>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Job Title</label><input class="input" id="pm-title" value="${esc(p.title || '')}"></div>
      <div class="form-group"><label class="form-label">Department</label><input class="input" id="pm-dept" value="${esc(p.department || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Level</label>
        <select class="select-styled" id="pm-level">
          ${['junior','mid','senior','lead','manager','director','vp','c-level'].map(l => `<option value="${l}" ${p.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Work Type</label>
        <select class="select-styled" id="pm-worktype">
          ${['onsite','hybrid','remote'].map(w => `<option value="${w}" ${p.workType === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Location</label><input class="input" id="pm-loc" value="${esc(p.location || '')}"></div>
      <div class="form-group"><label class="form-label">Salary Range</label>
        <div style="display:flex;gap:8px;"><input class="input" id="pm-salmin" value="${esc(p.salaryMin || '')}" placeholder="Min"><input class="input" id="pm-salmax" value="${esc(p.salaryMax || '')}" placeholder="Max"></div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Required Skills</label>${createTagInput('pm-req', p.requiredSkills || [])}</div>
    <div class="form-group"><label class="form-label">Nice-to-Have Skills</label>${createTagInput('pm-nice', p.niceToHaveSkills || [])}</div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="textarea" id="pm-desc" rows="3">${esc(p.description || '')}</textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitProject('${p.id || ''}')">${isEdit ? 'Save' : 'Create'}</button>
    </div>
  `, 'modal-lg');
  initTagInputs(document.querySelector('.modal'));
};

window.submitProject = async function(id) {
  const title = document.getElementById('pm-title').value.trim();
  if (!title) return toast('Title is required', 'error');
  const body = {
    title,
    department: document.getElementById('pm-dept').value.trim(),
    level: document.getElementById('pm-level').value,
    workType: document.getElementById('pm-worktype').value,
    location: document.getElementById('pm-loc').value.trim(),
    salaryMin: document.getElementById('pm-salmin').value.trim(),
    salaryMax: document.getElementById('pm-salmax').value.trim(),
    requiredSkills: getTagsFromWrap(document.querySelector('[data-tags="pm-req"]')),
    niceToHaveSkills: getTagsFromWrap(document.querySelector('[data-tags="pm-nice"]')),
    description: document.getElementById('pm-desc').value.trim()
  };
  if (id) {
    await api(`/api/projects/${id}`, { method: 'PUT', body });
  } else {
    body.pipelineStages = ['Sourced','Screening','Phone Screen','Technical','Culture Fit','Offer','Hired'];
    body.status = 'open';
    await api('/api/projects', { method: 'POST', body });
  }
  await loadAll();
  closeModal();
  render();
  toast(id ? 'Role updated' : 'Role created');
};

window.showProjectDetail = function(id) {
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  const cands = state.candidates.filter(c => c.projectId === id);
  showModal(`
    <div style="display:flex;justify-content:space-between;align-items:start;">
      <h2>${esc(p.title)}</h2>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm" onclick="closeModal(); showProjectModal(state.projects.find(x=>x.id==='${id}'))">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject('${id}')">Delete</button>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin:12px 0;font-size:13px;color:var(--text-dim);">
      <span>${esc(p.department)}</span><span>${esc(p.level)}</span><span>${esc(p.workType)}</span><span>${esc(p.location)}</span>
      ${p.salaryMin || p.salaryMax ? `<span>$${p.salaryMin || '?'}-$${p.salaryMax || '?'}</span>` : ''}
    </div>
    ${p.description ? `<div style="font-size:13px;margin-bottom:12px;">${esc(p.description)}</div>` : ''}
    <div class="detail-section">
      <h3>Skills</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${(p.requiredSkills || []).map(s => `<span class="badge badge-accent">${esc(s)}</span>`).join('')}
        ${(p.niceToHaveSkills || []).map(s => `<span class="badge badge-blue">${esc(s)}</span>`).join('')}
      </div>
    </div>
    <div class="detail-section">
      <h3>Pipeline (${cands.length} candidates)</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${(p.pipelineStages || []).map(s => {
          const n = cands.filter(c => c.stage === s).length;
          return `<span class="badge badge-accent">${esc(s)}: ${n}</span>`;
        }).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Close</button>
    </div>
  `, 'modal-lg');
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this role?')) return;
  await api(`/api/projects/${id}`, { method: 'DELETE' });
  await loadAll();
  closeModal();
  render();
  toast('Role deleted');
};

// --- INTEGRATIONS ---
function renderIntegrations() {
  const pc = document.getElementById('page-content');
  const allPlatforms = [
    { id: 'greenhouse', name: 'Greenhouse', type: 'API', desc: 'Full ATS integration via API key', fields: ['apiKey'] },
    { id: 'lever', name: 'Lever', type: 'API', desc: 'Import candidates from Lever ATS', fields: ['apiKey'] },
    { id: 'workable', name: 'Workable', type: 'API', desc: 'Sync with Workable recruiting', fields: ['apiKey', 'subdomain'] },
    { id: 'bamboohr', name: 'BambooHR', type: 'API', desc: 'BambooHR applicant tracking', fields: ['apiKey', 'subdomain'] },
    { id: 'ashby', name: 'Ashby', type: 'API', desc: 'Modern ATS integration', fields: ['apiKey'] },
    { id: 'smartrecruiters', name: 'SmartRecruiters', type: 'API', desc: 'Enterprise recruiting platform', fields: ['apiKey'] },
    { id: 'linkedin', name: 'LinkedIn Jobs', type: 'BrowserBase', desc: 'Scrape LinkedIn job applicants via BrowserBase', fields: [] },
    { id: 'indeed', name: 'Indeed', type: 'BrowserBase', desc: 'Import Indeed applicants', fields: [] },
    { id: 'glassdoor', name: 'Glassdoor', type: 'BrowserBase', desc: 'Scrape Glassdoor postings', fields: [] },
    { id: 'angellist', name: 'AngelList / Wellfound', type: 'BrowserBase', desc: 'Startup talent platform', fields: [] }
  ];

  pc.innerHTML = `
    <div class="page-header"><h1>Integrations</h1></div>
    <div class="tabs">
      <div class="tab active" onclick="document.querySelectorAll('.integ-section').forEach(s=>s.classList.remove('hidden')); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');">All</div>
      <div class="tab" onclick="document.querySelectorAll('.integ-section').forEach(s=>s.classList.add('hidden')); document.getElementById('integ-api').classList.remove('hidden'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');">API</div>
      <div class="tab" onclick="document.querySelectorAll('.integ-section').forEach(s=>s.classList.add('hidden')); document.getElementById('integ-browser').classList.remove('hidden'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');">BrowserBase</div>
    </div>
    <div style="padding:16px 28px;">
      <div class="integ-section" id="integ-api">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">API Integrations</h3>
        <div class="integration-grid" style="padding:0;">
          ${allPlatforms.filter(p => p.type === 'API').map(p => {
            const existing = state.integrations.find(i => i.platform === p.id);
            return integrationCard(p, existing);
          }).join('')}
        </div>
      </div>
      <div class="integ-section" id="integ-browser" style="margin-top:20px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">BrowserBase Integrations</h3>
        <div class="integration-grid" style="padding:0;">
          ${allPlatforms.filter(p => p.type === 'BrowserBase').map(p => {
            const existing = state.integrations.find(i => i.platform === p.id);
            return integrationCard(p, existing);
          }).join('')}
        </div>
      </div>
    </div>`;
}

function integrationCard(platform, existing) {
  const connected = existing && existing.apiKey;
  return `
    <div class="integration-card">
      <div class="integration-card-header">
        <div>
          <div class="integration-card-name">${platform.name}</div>
          <div class="integration-card-type">${platform.type} Integration</div>
        </div>
        ${connected ? '<span class="badge badge-green">Connected</span>' : '<span class="badge" style="background:var(--bg-elevated);color:var(--text-muted);">Not connected</span>'}
      </div>
      <div style="font-size:12px;color:var(--text-dim);">${platform.desc}</div>
      ${platform.fields.includes('apiKey') ? `
        <div class="form-group" style="margin-bottom:6px;">
          <label class="form-label">API Key</label>
          <input class="input" data-cfg-key="${platform.id}" value="${existing ? existing.apiKey : ''}" placeholder="Enter API key">
        </div>` : ''}
      ${platform.fields.includes('subdomain') ? `
        <div class="form-group" style="margin-bottom:6px;">
          <label class="form-label">Subdomain</label>
          <input class="input" data-cfg-sub="${platform.id}" value="${existing ? existing.subdomain || '' : ''}" placeholder="your-company">
        </div>` : ''}
      ${platform.type === 'BrowserBase' ? '<div style="font-size:11px;color:var(--text-muted);">Requires BROWSERBASE_API_KEY environment variable</div>' : ''}
      <div style="display:flex;gap:6px;margin-top:4px;">
        ${platform.fields.length > 0 ? `<button class="btn btn-sm btn-primary" onclick="saveIntegration('${platform.id}')">Save</button>` : ''}
        ${connected ? `<button class="btn btn-sm" onclick="testIntegration('${platform.id}')">Test</button>` : ''}
        ${connected ? `<button class="btn btn-sm" onclick="syncIntegration('${platform.id}')">Sync</button>` : ''}
      </div>
      ${existing && existing.lastSync ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Last sync: ${timeAgo(existing.lastSync)}</div>` : ''}
    </div>`;
}

window.saveIntegration = async function(platform) {
  const keyInput = document.querySelector(`[data-cfg-key="${platform}"]`);
  const subInput = document.querySelector(`[data-cfg-sub="${platform}"]`);
  await api('/api/integrations', { method: 'POST', body: {
    platform,
    apiKey: keyInput ? keyInput.value.trim() : '',
    subdomain: subInput ? subInput.value.trim() : ''
  }});
  await loadAll();
  renderIntegrations();
  toast(`${platform} saved`);
};

window.testIntegration = async function(platform) {
  toast(`Testing ${platform}...`);
  const result = await api(`/api/integrations/${platform}/test`, { method: 'POST' });
  if (result.ok) toast(`${platform} connection successful!`);
  else toast(`${platform} test failed: ${result.error}`, 'error');
};

window.syncIntegration = async function(platform) {
  toast(`Syncing ${platform}...`);
  const result = await api(`/api/integrations/${platform}/sync`, { method: 'POST' });
  if (result.ok) { await loadAll(); renderIntegrations(); toast(`${platform} synced`); }
  else toast(`Sync failed: ${result.error}`, 'error');
};

// --- SCORING ---
function renderScoring() {
  const pc = document.getElementById('page-content');
  const w = state.scoring.weights || {};
  const labels = { skillsMatch: 'Skills Match', experience: 'Experience', education: 'Education', cultureFit: 'Culture Fit', communication: 'Communication' };
  const unscored = state.candidates.filter(c => c.score === null || c.score === undefined).length;

  pc.innerHTML = `
    <div class="page-header">
      <h1>Scoring Configuration</h1>
      <div class="page-header-actions">
        ${unscored > 0 ? `<button class="btn btn-primary" onclick="showBulkScoreModal()">Score ${unscored} Unscored</button>` : ''}
      </div>
    </div>
    <div class="section-pad">
      <div class="card" style="padding:20px;max-width:600px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;">Scoring Weights</h3>
        <p style="font-size:12px;color:var(--text-dim);margin-bottom:16px;">Adjust the importance of each factor. Higher weight = more impact on final score.</p>
        ${Object.entries(w).map(([key, val]) => `
          <div class="weight-row">
            <div class="weight-label">${labels[key] || key}</div>
            <input type="range" class="weight-slider" min="1" max="10" value="${val}" data-weight="${key}">
            <div class="weight-value" id="swv-${key}">${val}</div>
          </div>`).join('')}
        <button class="btn btn-primary" style="margin-top:16px;" onclick="saveScoringWeights()">Save Weights</button>
      </div>
    </div>
    <div class="section-pad">
      <div class="card" style="padding:20px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Score Distribution</h3>
        <div style="display:flex;gap:20px;">
          <div><span style="font-size:24px;font-weight:700;color:var(--green);">${state.candidates.filter(c => c.score >= 80).length}</span><div class="text-dim" style="font-size:12px;">High (80+)</div></div>
          <div><span style="font-size:24px;font-weight:700;color:var(--yellow);">${state.candidates.filter(c => c.score >= 60 && c.score < 80).length}</span><div class="text-dim" style="font-size:12px;">Medium (60-79)</div></div>
          <div><span style="font-size:24px;font-weight:700;color:var(--red);">${state.candidates.filter(c => c.score !== null && c.score < 60).length}</span><div class="text-dim" style="font-size:12px;">Low (&lt;60)</div></div>
          <div><span style="font-size:24px;font-weight:700;color:var(--text-muted);">${unscored}</span><div class="text-dim" style="font-size:12px;">Unscored</div></div>
        </div>
      </div>
    </div>`;

  // Init sliders
  pc.querySelectorAll('.weight-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const key = slider.dataset.weight;
      document.getElementById(`swv-${key}`).textContent = slider.value;
    });
  });
}

window.saveScoringWeights = async function() {
  const weights = {};
  document.querySelectorAll('.weight-slider').forEach(s => {
    weights[s.dataset.weight] = Number(s.value);
  });
  await api('/api/scoring', { method: 'PUT', body: { weights } });
  state.scoring.weights = weights;
  toast('Scoring weights saved');
};

// --- REPORTS ---
function renderReports() {
  const pc = document.getElementById('page-content');
  const d = state.dashboard;
  const sources = d.sourceDistribution || {};
  const stages = d.stageDistribution || {};
  const maxSource = Math.max(1, ...Object.values(sources));

  pc.innerHTML = `
    <div class="page-header">
      <h1>Reports</h1>
      <div class="page-header-actions">
        <button class="btn" onclick="exportCandidates()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M3 7l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Export All CSV
        </button>
      </div>
    </div>
    <div class="section-pad">
      <div class="grid-2">
        <div class="card" style="padding:18px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Candidates by Source</h3>
          <div class="bar-chart">
            ${Object.entries(sources).map(([src, count]) => `
              <div class="bar-col">
                <div class="bar-value">${count}</div>
                <div class="bar-fill" style="height:${(count / maxSource) * 100}%;background:var(--blue);"></div>
                <div class="bar-label">${esc(src)}</div>
              </div>`).join('')}
            ${Object.keys(sources).length === 0 ? '<div class="empty-state" style="padding:20px;"><p>No data</p></div>' : ''}
          </div>
        </div>
        <div class="card" style="padding:18px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Pipeline Summary</h3>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${Object.entries(stages).map(([stage, count]) => `
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:100px;font-size:12px;color:var(--text-dim);">${esc(stage)}</div>
                <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                  <div style="width:${(count / (d.totalCandidates || 1)) * 100}%;height:100%;background:var(--accent);border-radius:4px;"></div>
                </div>
                <div style="width:30px;font-size:12px;font-weight:600;text-align:right;">${count}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="section-pad">
      <div class="card" style="padding:18px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Per-Role Analytics</h3>
        <table>
          <thead><tr><th>Role</th><th>Candidates</th><th>Avg Score</th><th>In Pipeline</th></tr></thead>
          <tbody>
            ${state.projects.map(p => {
              const cands = state.candidates.filter(c => c.projectId === p.id);
              const scored = cands.filter(c => c.score !== null && c.score !== undefined);
              const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : '—';
              const inPipeline = cands.filter(c => c.stage !== 'Rejected' && c.stage !== 'Hired').length;
              return `<tr><td style="font-weight:500;">${esc(p.title)}</td><td>${cands.length}</td><td>${scoreBadge(typeof avg === 'number' ? avg : null)}</td><td>${inPipeline}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// --- SETTINGS ---
function renderSettings() {
  const pc = document.getElementById('page-content');
  const s = state.settings;
  pc.innerHTML = `
    <div class="page-header"><h1>Settings</h1></div>
    <div class="section-pad">
      <div class="card" style="padding:20px;max-width:500px;">
        <div class="form-group">
          <label class="form-label">Company Name</label>
          <input class="input" id="set-company" value="${esc(s.companyName || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Timezone</label>
          <input class="input" id="set-tz" value="${esc(s.timezone || 'UTC')}">
        </div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
      </div>
      <div class="card mt-16" style="padding:20px;max-width:500px;">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;">Reset Onboarding</h3>
        <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Re-run the onboarding wizard. This won't delete existing data.</p>
        <button class="btn btn-danger" onclick="resetOnboarding()">Reset Onboarding</button>
      </div>
    </div>`;
}

window.saveSettings = async function() {
  await api('/api/settings', { method: 'POST', body: {
    companyName: document.getElementById('set-company').value.trim(),
    timezone: document.getElementById('set-tz').value.trim()
  }});
  toast('Settings saved');
};

window.resetOnboarding = async function() {
  if (!confirm('Reset onboarding? Existing data will be kept.')) return;
  await api('/api/settings', { method: 'POST', body: { onboardingComplete: false } });
  state.onboardingComplete = false;
  state.onboarding = { step: 0, roles: [], profiles: {}, stages: ['Sourced','Screening','Phone Screen','Technical','Culture Fit','Offer','Hired'] };
  render();
};

window.filterPipelineModal = function() {
  toast('Use the role selector to filter the pipeline');
};

// ============================================================
// INIT
// ============================================================
(async function init() {
  await loadAll();
  const page = location.hash.slice(1) || 'dashboard';
  navigate(page);
})();
