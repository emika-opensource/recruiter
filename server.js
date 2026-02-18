const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory
const DATA_DIR = fs.existsSync('/home/node/emika')
  ? '/home/node/emika/recruiter'
  : path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Content publishing — AI-generated reports, dashboards, analyses
const CONTENT_DIR = path.join(__dirname, 'content');
try { require('fs').mkdirSync(CONTENT_DIR, { recursive: true }); } catch(e) {}
app.use('/content', express.static(CONTENT_DIR));

// --- Helpers ---
function loadJson(file, defaultVal) {
  const fp = path.join(DATA_DIR, file);
  try {
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    return typeof defaultVal === 'function' ? defaultVal() : (defaultVal !== undefined ? defaultVal : []);
  } catch { return typeof defaultVal === 'function' ? defaultVal() : (defaultVal !== undefined ? defaultVal : []); }
}
function saveJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function addActivity(action, details = {}) {
  const log = loadJson('activity-log.json', []);
  log.unshift({ id: uuidv4(), action, details, timestamp: new Date().toISOString() });
  if (log.length > 500) log.length = 500;
  saveJson('activity-log.json', log);
}

// ============ SETTINGS / ONBOARDING ============
app.get('/api/settings', (req, res) => {
  res.json(loadJson('settings.json', { onboardingComplete: false, companyName: '', timezone: 'UTC' }));
});
app.post('/api/settings', (req, res) => {
  const s = { ...loadJson('settings.json', { onboardingComplete: false }), ...req.body };
  saveJson('settings.json', s);
  res.json(s);
});
app.get('/api/onboarding', (req, res) => {
  const s = loadJson('settings.json', { onboardingComplete: false });
  res.json({ complete: !!s.onboardingComplete });
});
app.post('/api/onboarding/complete', (req, res) => {
  const s = loadJson('settings.json', {});
  s.onboardingComplete = true;
  saveJson('settings.json', s);
  addActivity('onboarding_complete', {});
  res.json({ ok: true });
});

// ============ PROJECTS (Roles) ============
app.get('/api/projects', (req, res) => {
  res.json(loadJson('projects.json', []));
});
app.post('/api/projects', (req, res) => {
  const projects = loadJson('projects.json', []);
  const p = {
    id: uuidv4(),
    title: '',
    department: '',
    level: '',
    location: '',
    workType: 'onsite',
    salaryMin: '',
    salaryMax: '',
    requiredSkills: [],
    niceToHaveSkills: [],
    mustHaveQualifications: [],
    dealBreakers: [],
    cultureFitCriteria: [],
    experienceLevel: '',
    educationPreference: '',
    description: '',
    status: 'open',
    pipelineStages: [],
    createdAt: new Date().toISOString(),
    ...req.body
  };
  projects.push(p);
  saveJson('projects.json', projects);
  addActivity('project_created', { projectId: p.id, title: p.title });
  res.json(p);
});
app.put('/api/projects/:id', (req, res) => {
  const projects = loadJson('projects.json', []);
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  projects[idx] = { ...projects[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveJson('projects.json', projects);
  res.json(projects[idx]);
});
app.delete('/api/projects/:id', (req, res) => {
  let projects = loadJson('projects.json', []);
  const p = projects.find(p => p.id === req.params.id);
  projects = projects.filter(p => p.id !== req.params.id);
  saveJson('projects.json', projects);
  if (p) addActivity('project_deleted', { title: p.title });
  res.json({ ok: true });
});

// ============ CANDIDATES ============
app.get('/api/candidates', (req, res) => {
  let candidates = loadJson('candidates.json', []);
  const { projectId, stage, search, minScore, maxScore, source, sort } = req.query;
  if (projectId) candidates = candidates.filter(c => c.projectId === projectId);
  if (stage) candidates = candidates.filter(c => c.stage === stage);
  if (source) candidates = candidates.filter(c => c.source === source);
  if (minScore) candidates = candidates.filter(c => (c.score || 0) >= Number(minScore));
  if (maxScore) candidates = candidates.filter(c => (c.score || 0) <= Number(maxScore));
  if (search) {
    const s = search.toLowerCase();
    candidates = candidates.filter(c =>
      (c.name + ' ' + c.email + ' ' + (c.role || '')).toLowerCase().includes(s)
    );
  }
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    candidates.sort((a, b) => {
      const av = a[field], bv = b[field];
      if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
      return desc ? String(bv || '').localeCompare(String(av || '')) : String(av || '').localeCompare(String(bv || ''));
    });
  }
  res.json(candidates);
});
app.post('/api/candidates', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const c = {
    id: uuidv4(),
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    resumeText: '',
    notes: '',
    source: 'manual',
    projectId: '',
    role: '',
    stage: 'Sourced',
    score: null,
    scoreBreakdown: null,
    stageHistory: [],
    createdAt: new Date().toISOString(),
    ...req.body
  };
  c.stageHistory = [{ stage: c.stage, timestamp: c.createdAt }];
  candidates.push(c);
  saveJson('candidates.json', candidates);
  addActivity('candidate_added', { candidateId: c.id, name: c.name, role: c.role });
  res.json(c);
});
app.put('/api/candidates/:id', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  candidates[idx] = { ...candidates[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveJson('candidates.json', candidates);
  res.json(candidates[idx]);
});
app.delete('/api/candidates/:id', (req, res) => {
  let candidates = loadJson('candidates.json', []);
  candidates = candidates.filter(c => c.id !== req.params.id);
  saveJson('candidates.json', candidates);
  res.json({ ok: true });
});

// Bulk import
app.post('/api/candidates/import', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const { items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items' });
  const now = new Date().toISOString();
  const imported = [];
  for (const item of items) {
    const c = {
      id: uuidv4(), name: '', email: '', phone: '', linkedin: '', resumeText: '', notes: '',
      source: 'import', projectId: '', role: '', stage: 'Sourced', score: null,
      scoreBreakdown: null, stageHistory: [{ stage: 'Sourced', timestamp: now }],
      createdAt: now, ...item
    };
    candidates.push(c);
    imported.push(c);
  }
  saveJson('candidates.json', candidates);
  addActivity('candidates_imported', { count: imported.length });
  res.json({ imported: imported.length, candidates: imported });
});

// --- Shared scoring logic ---
function autoScoreCandidate(candidate, project, weights) {
  const breakdown = {};
  let totalWeight = 0, totalScore = 0;

  // Skills match
  if (project && project.requiredSkills && project.requiredSkills.length) {
    const w = weights.skillsMatch || 5;
    totalWeight += w;
    const text = (candidate.resumeText + ' ' + candidate.notes + ' ' + candidate.name).toLowerCase();
    const matched = project.requiredSkills.filter(s => text.includes(s.toLowerCase()));
    const ratio = matched.length / project.requiredSkills.length;
    const pts = Math.round(ratio * 100);
    breakdown.skillsMatch = { score: pts, weight: w, matched, total: project.requiredSkills.length };
    totalScore += pts * w;
  }

  // Experience
  if (project && project.experienceLevel) {
    const w = weights.experience || 5;
    totalWeight += w;
    const text = (candidate.resumeText + ' ' + candidate.notes).toLowerCase();
    const expKeywords = { 'junior': ['junior', '0-2 years', 'entry', 'graduate'], 'mid': ['mid', '3-5 years', 'intermediate'], 'senior': ['senior', '5+ years', '7+ years', 'lead', 'staff'], 'lead': ['lead', 'principal', 'staff', '10+ years', 'director', 'head'] };
    const keywords = expKeywords[project.experienceLevel.toLowerCase()] || [];
    const hasMatch = keywords.some(k => text.includes(k));
    const pts = hasMatch ? 85 : 40;
    breakdown.experience = { score: pts, weight: w, level: project.experienceLevel, matched: hasMatch };
    totalScore += pts * w;
  }

  // Education
  if (project && project.educationPreference) {
    const w = weights.education || 5;
    totalWeight += w;
    const text = (candidate.resumeText + ' ' + candidate.notes).toLowerCase();
    const hasEdu = text.includes(project.educationPreference.toLowerCase()) || text.includes('degree') || text.includes('university') || text.includes('bachelor') || text.includes('master');
    const pts = hasEdu ? 80 : 35;
    breakdown.education = { score: pts, weight: w, preference: project.educationPreference, matched: hasEdu };
    totalScore += pts * w;
  }

  // Culture fit
  if (project && project.cultureFitCriteria && project.cultureFitCriteria.length) {
    const w = weights.cultureFit || 5;
    totalWeight += w;
    const text = (candidate.resumeText + ' ' + candidate.notes).toLowerCase();
    const matched = project.cultureFitCriteria.filter(cr => text.includes(cr.toLowerCase()));
    const ratio = project.cultureFitCriteria.length > 0 ? matched.length / project.cultureFitCriteria.length : 0;
    const pts = Math.round(ratio * 100);
    breakdown.cultureFit = { score: pts, weight: w, matched, total: project.cultureFitCriteria.length };
    totalScore += pts * w;
  }

  // Communication (keyword based)
  {
    const w = weights.communication || 5;
    totalWeight += w;
    const text = (candidate.resumeText + ' ' + candidate.notes).toLowerCase();
    const commWords = ['communication', 'presentation', 'writing', 'public speaking', 'leadership', 'teamwork', 'collaboration', 'mentoring'];
    const matched = commWords.filter(kw => text.includes(kw));
    const pts = Math.min(100, matched.length * 20 + 20);
    breakdown.communication = { score: pts, weight: w, matched };
    totalScore += pts * w;
  }

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  return { score: finalScore, breakdown };
}

// Score a candidate
app.post('/api/candidates/:id/score', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const c = candidates[idx];
  const projects = loadJson('projects.json', []);
  const scoring = loadJson('scoring-criteria.json', { weights: { skillsMatch: 8, experience: 7, education: 5, cultureFit: 6, communication: 5 } });
  const project = projects.find(p => p.id === c.projectId);

  // Manual override
  if (req.body.score !== undefined) {
    c.score = req.body.score;
    c.scoreBreakdown = req.body.scoreBreakdown || c.scoreBreakdown;
    c.scoreReason = req.body.reason || 'Manual override';
    candidates[idx] = c;
    saveJson('candidates.json', candidates);
    addActivity('candidate_scored', { candidateId: c.id, name: c.name, score: c.score, method: 'manual' });
    return res.json(c);
  }

  // Auto-score
  const result = autoScoreCandidate(c, project, scoring.weights || {});
  c.score = result.score;
  c.scoreBreakdown = result.breakdown;
  c.scoreReason = 'Auto-scored based on criteria';
  c.updatedAt = new Date().toISOString();
  candidates[idx] = c;
  saveJson('candidates.json', candidates);
  addActivity('candidate_scored', { candidateId: c.id, name: c.name, score: result.score, method: 'auto' });
  res.json(c);
});

// Batch score
app.post('/api/candidates/batch-score', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const projects = loadJson('projects.json', []);
  const scoring = loadJson('scoring-criteria.json', { weights: { skillsMatch: 8, experience: 7, education: 5, cultureFit: 6, communication: 5 } });
  let scored = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c.score !== null && c.score !== undefined) continue;
    const project = projects.find(p => p.id === c.projectId);
    const result = autoScoreCandidate(c, project, scoring.weights || {});
    candidates[i].score = result.score;
    candidates[i].scoreBreakdown = result.breakdown;
    candidates[i].scoreReason = 'Auto-scored (batch)';
    candidates[i].updatedAt = new Date().toISOString();
    scored++;
  }

  saveJson('candidates.json', candidates);
  addActivity('batch_score', { scored });
  res.json({ scored });
});

// Move stage
app.put('/api/candidates/:id/stage', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { stage } = req.body;
  const prev = candidates[idx].stage;
  candidates[idx].stage = stage;
  if (!candidates[idx].stageHistory) candidates[idx].stageHistory = [];
  candidates[idx].stageHistory.push({ stage, timestamp: new Date().toISOString(), from: prev });
  candidates[idx].updatedAt = new Date().toISOString();
  saveJson('candidates.json', candidates);
  addActivity('stage_change', { candidateId: candidates[idx].id, name: candidates[idx].name, from: prev, to: stage });
  res.json(candidates[idx]);
});

// CSV export
app.get('/api/candidates/export', (req, res) => {
  const candidates = loadJson('candidates.json', []);
  const { projectId } = req.query;
  let data = projectId ? candidates.filter(c => c.projectId === projectId) : candidates;
  const headers = ['Name', 'Email', 'Phone', 'LinkedIn', 'Role', 'Stage', 'Score', 'Source', 'Created'];
  const rows = data.map(c => [c.name, c.email, c.phone, c.linkedin, c.role, c.stage, c.score || '', c.source, c.createdAt].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=candidates.csv');
  res.send(csv);
});

// ============ INTEGRATIONS ============
app.get('/api/integrations', (req, res) => {
  const integrations = loadJson('integrations.json', []);
  // Mask API keys
  const masked = integrations.map(i => ({
    ...i,
    apiKey: i.apiKey ? i.apiKey.slice(0, 4) + '****' + i.apiKey.slice(-4) : ''
  }));
  res.json(masked);
});
app.post('/api/integrations', (req, res) => {
  const integrations = loadJson('integrations.json', []);
  const existing = integrations.findIndex(i => i.platform === req.body.platform);
  const integration = {
    id: uuidv4(),
    platform: '',
    apiKey: '',
    subdomain: '',
    enabled: true,
    lastSync: null,
    syncStatus: 'never',
    candidatesSynced: 0,
    ...req.body
  };
  if (existing >= 0) {
    // Update existing, preserve apiKey if masked
    if (integration.apiKey && integration.apiKey.includes('****')) {
      integration.apiKey = integrations[existing].apiKey;
    }
    integrations[existing] = { ...integrations[existing], ...integration, id: integrations[existing].id };
  } else {
    integrations.push(integration);
  }
  saveJson('integrations.json', integrations);
  addActivity('integration_configured', { platform: integration.platform });
  res.json({ ok: true });
});

// Test connection
app.post('/api/integrations/:platform/test', async (req, res) => {
  const integrations = loadJson('integrations.json', []);
  const integration = integrations.find(i => i.platform === req.params.platform);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  const endpoints = {
    greenhouse: { url: 'https://harvest.greenhouse.io/v1/candidates?per_page=1', auth: 'basic' },
    lever: { url: 'https://api.lever.co/v1/candidates?limit=1', auth: 'basic' },
    workable: { url: `https://${integration.subdomain}.workable.com/spi/v3/candidates?limit=1`, auth: 'bearer' },
    bamboohr: { url: `https://api.bamboohr.com/api/gateway.php/${integration.subdomain}/v1/applicant_tracking/applications?page=1&per_page=1`, auth: 'basic' },
    ashby: { url: 'https://api.ashbyhq.com/candidate.list', auth: 'bearer', method: 'POST', body: '{"limit":1}' },
    smartrecruiters: { url: 'https://api.smartrecruiters.com/candidates?limit=1', auth: 'bearer' }
  };

  const ep = endpoints[req.params.platform];
  if (!ep) return res.json({ ok: false, error: 'Unsupported platform for test' });

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (ep.auth === 'basic') headers['Authorization'] = 'Basic ' + Buffer.from(integration.apiKey + ':').toString('base64');
    else headers['Authorization'] = 'Bearer ' + integration.apiKey;

    const resp = await fetch(ep.url, { method: ep.method || 'GET', headers, body: ep.body || undefined });
    if (resp.ok || resp.status === 200) {
      res.json({ ok: true, message: 'Connection successful' });
    } else {
      res.json({ ok: false, error: `API returned ${resp.status}` });
    }
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Sync candidates from platform
app.post('/api/integrations/:platform/sync', async (req, res) => {
  const integrations = loadJson('integrations.json', []);
  const idx = integrations.findIndex(i => i.platform === req.params.platform);
  if (idx === -1) return res.status(404).json({ error: 'Integration not found' });

  // Mark syncing
  integrations[idx].syncStatus = 'syncing';
  saveJson('integrations.json', integrations);

  try {
    // In production, this would call the actual API. For now, update sync status.
    integrations[idx].lastSync = new Date().toISOString();
    integrations[idx].syncStatus = 'synced';
    saveJson('integrations.json', integrations);
    addActivity('integration_synced', { platform: req.params.platform });
    res.json({ ok: true, message: `Sync initiated for ${req.params.platform}` });
  } catch (e) {
    integrations[idx].syncStatus = 'error';
    saveJson('integrations.json', integrations);
    res.json({ ok: false, error: e.message });
  }
});

// ============ SCORING CRITERIA ============
app.get('/api/scoring', (req, res) => {
  res.json(loadJson('scoring-criteria.json', {
    weights: { skillsMatch: 8, experience: 7, education: 5, cultureFit: 6, communication: 5 }
  }));
});
app.put('/api/scoring', (req, res) => {
  saveJson('scoring-criteria.json', req.body);
  res.json(req.body);
});

// ============ DASHBOARD ============
app.get('/api/dashboard', (req, res) => {
  const projects = loadJson('projects.json', []);
  const candidates = loadJson('candidates.json', []);
  const integrations = loadJson('integrations.json', []);
  const activity = loadJson('activity-log.json', []);

  const activeRoles = projects.filter(p => p.status === 'open').length;
  const totalCandidates = candidates.length;
  const unscored = candidates.filter(c => c.score === null || c.score === undefined).length;

  const stageMap = {};
  for (const c of candidates) {
    stageMap[c.stage] = (stageMap[c.stage] || 0) + 1;
  }

  const sourceMap = {};
  for (const c of candidates) {
    sourceMap[c.source || 'unknown'] = (sourceMap[c.source || 'unknown'] || 0) + 1;
  }

  const integrationStatus = integrations.map(i => ({
    platform: i.platform, syncStatus: i.syncStatus, lastSync: i.lastSync, enabled: i.enabled
  }));

  res.json({
    activeRoles,
    totalCandidates,
    unscored,
    stageDistribution: stageMap,
    sourceDistribution: sourceMap,
    integrationStatus,
    recentActivity: activity.slice(0, 20)
  });
});

// ============ ACTIVITY LOG ============
app.get('/api/activity', (req, res) => {
  const log = loadJson('activity-log.json', []);
  const { limit } = req.query;
  res.json(limit ? log.slice(0, Number(limit)) : log);
});

// ============ SPA FALLBACK ============
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Recruiter server running on port ${PORT}`));
