# Recruiter Tools — API Reference

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.

## ⚠️ IMPORTANT: Port 3000

Your **Recruiting Pipeline** web application is ALREADY RUNNING on port 3000. It starts automatically via start.sh.

- **DO NOT** kill anything on port 3000 — that is YOUR app
- **DO NOT** try to start a new server on port 3000
- The app is accessible to the user via the browser panel (iframe)
- If you need to build something for the user, deploy it on a DIFFERENT port using PM2


## Projects (Roles)
```
GET    /api/projects
POST   /api/projects              { title, department, level, location, workType, salaryMin, salaryMax, requiredSkills[], niceToHaveSkills[], mustHaveQualifications[], dealBreakers[], cultureFitCriteria[], experienceLevel, educationPreference, pipelineStages[], status }
PUT    /api/projects/:id
DELETE /api/projects/:id
```

## Candidates
```
GET    /api/candidates?projectId=&stage=&search=&minScore=&maxScore=&source=&sort=
POST   /api/candidates            { name, email, phone, linkedin, resumeText, notes, source, projectId, role, stage }
PUT    /api/candidates/:id
DELETE /api/candidates/:id
POST   /api/candidates/import     { items: [{ name, email, phone, linkedin, resumeText, notes, source, projectId, role }] }
POST   /api/candidates/:id/score  { } (auto) or { score, scoreBreakdown, reason } (manual)
POST   /api/candidates/batch-score
PUT    /api/candidates/:id/stage  { stage }
GET    /api/candidates/export?projectId=
```

## Integrations
```
GET    /api/integrations
POST   /api/integrations          { platform, apiKey, subdomain, enabled }
POST   /api/integrations/:platform/test
POST   /api/integrations/:platform/sync
```
Platforms: greenhouse, lever, workable, bamboohr, ashby, smartrecruiters, linkedin, indeed, glassdoor, angellist

## Scoring
```
GET    /api/scoring
PUT    /api/scoring               { weights: { skillsMatch: 1-10, experience: 1-10, education: 1-10, cultureFit: 1-10, communication: 1-10 } }
```

## Dashboard & Activity
```
GET    /api/dashboard
GET    /api/activity?limit=
```

## Settings & Onboarding
```
GET    /api/settings
POST   /api/settings              { companyName, timezone, onboardingComplete }
GET    /api/onboarding
POST   /api/onboarding/complete
```

## Screenshots & File Sharing

### Taking Screenshots
Use Playwright (pre-installed) to capture any website:
```bash
npx playwright screenshot --browser chromium https://example.com /tmp/screenshot.png
```

If Chromium is not installed yet, install it first:
```bash
npx playwright install chromium
```

### Sharing Files & Images with the User
Upload to the Emika API to get a shareable URL:
```bash
# Get your seat token

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
TOKEN=$(python3 -c "import json; print(json.load(open('/home/node/.openclaw/openclaw.json'))['gateway']['auth']['token'])")

# Upload any file

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | python3 -c "import sys,json; print(json.load(sys.stdin)['full_url'])")

# Include the URL in your response as markdown image

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.
NEVER use port 3001, 8080, or any other port. ONLY port 3000.
echo "![Screenshot]($URL)"
```

**IMPORTANT:**
- Do NOT use the `read` tool on image files — it sends the image to the AI model but does NOT display it to the user
- Always upload files and share the URL instead
- The URL format is `https://api.emika.ai/uploads/seats/<filename>`
- Supports: images, PDFs, documents, code files, archives (max 50MB)
