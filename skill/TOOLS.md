---
name: recruiter
description: AI-powered hiring pipeline with projects (roles), candidate management, scoring, integrations (ATS), and analytics
---

## ⛔ NEVER write data as files. ALWAYS use the API.

## CRITICAL: Port 3000 Only
You MUST deploy ONLY on port 3000. Nginx ONLY proxies port 3000 — any other port will NOT be accessible.
If port 3000 is busy: `pm2 delete all` then `pm2 start your-app.js --name app` on port 3000.

## 🚨 Your App is ALREADY RUNNING
Your **Recruiter** web application is ALREADY RUNNING on port 3000.
- **DO NOT** kill anything on port 3000
- **DO NOT** try to start a new server
- All API endpoints below are served by this app at `http://localhost:3000`

## API Endpoints Summary

| Category | Endpoints |
|----------|-----------|
| Settings | `GET/POST /api/settings` |
| Onboarding | `GET /api/onboarding`, `POST /api/onboarding/complete` |
| Projects (Roles) | `GET/POST /api/projects`, `PUT/DELETE /api/projects/:id` |
| Candidates | `GET/POST /api/candidates`, `PUT/DELETE /api/candidates/:id`, `GET /api/candidates/export` |
| Candidate Actions | `POST /api/candidates/import`, `POST /api/candidates/:id/score`, `POST /api/candidates/batch-score`, `PUT /api/candidates/:id/stage` |
| Integrations | `GET/POST /api/integrations`, `POST /api/integrations/:platform/test`, `POST /api/integrations/:platform/sync` |
| Scoring | `GET/PUT /api/scoring` |
| Dashboard | `GET /api/dashboard` |
| Activity | `GET /api/activity` |

## Detailed API Reference

### Settings

**Get settings**:
```bash
curl http://localhost:3000/api/settings
```
Response: `{ "onboardingComplete": false, "companyName": "", "timezone": "UTC" }`

**Update settings**:
```bash
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{ "companyName": "Acme Corp", "timezone": "America/New_York" }'
```

### Onboarding

**Check onboarding status**:
```bash
curl http://localhost:3000/api/onboarding
```
Response: `{ "complete": false }`

**Complete onboarding**:
```bash
curl -X POST http://localhost:3000/api/onboarding/complete
```

### Projects (Roles)

**List projects**:
```bash
curl http://localhost:3000/api/projects
```

**Create a project (role)**:
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Backend Engineer",
    "department": "Engineering",
    "level": "Senior",
    "location": "San Francisco, CA",
    "workType": "hybrid",
    "salaryMin": "150000",
    "salaryMax": "200000",
    "requiredSkills": ["Go", "PostgreSQL", "Kubernetes"],
    "niceToHaveSkills": ["Rust", "GraphQL"],
    "mustHaveQualifications": ["5+ years backend experience"],
    "dealBreakers": ["No remote-only"],
    "cultureFitCriteria": ["collaborative", "self-starter"],
    "experienceLevel": "senior",
    "educationPreference": "CS degree preferred",
    "description": "Building core platform services...",
    "status": "open",
    "pipelineStages": ["Sourced", "Screen", "Technical", "Onsite", "Offer", "Hired"]
  }'
```
- `workType`: `onsite` | `remote` | `hybrid`
- `status`: `open` | `closed` | `paused`

**Update a project**:
```bash
curl -X PUT http://localhost:3000/api/projects/PROJ_ID \
  -H "Content-Type: application/json" \
  -d '{ "status": "closed" }'
```

**Delete a project**:
```bash
curl -X DELETE http://localhost:3000/api/projects/PROJ_ID
```

### Candidates

**List candidates** (with filters):
```bash
curl http://localhost:3000/api/candidates
curl "http://localhost:3000/api/candidates?projectId=PROJ_ID&stage=Screen&search=sarah&minScore=70&sort=-score"
```
Filter params: `projectId`, `stage`, `search`, `minScore`, `maxScore`, `source`, `sort` (prefix `-` for desc).

**Create a candidate**:
```bash
curl -X POST http://localhost:3000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Chen",
    "email": "sarah@example.com",
    "phone": "+1234567890",
    "linkedin": "https://linkedin.com/in/sarachen",
    "resumeText": "10 years backend engineering, Go, Kubernetes, AWS...",
    "notes": "Strong systems background",
    "source": "linkedin",
    "projectId": "PROJ_ID",
    "role": "Senior Backend Engineer",
    "stage": "Sourced"
  }'
```
- `source`: `manual` | `linkedin` | `referral` | `import` | etc.

**Update a candidate**:
```bash
curl -X PUT http://localhost:3000/api/candidates/CAND_ID \
  -H "Content-Type: application/json" \
  -d '{ "notes": "Great phone screen, moving to technical" }'
```

**Delete a candidate**:
```bash
curl -X DELETE http://localhost:3000/api/candidates/CAND_ID
```

**Bulk import candidates**:
```bash
curl -X POST http://localhost:3000/api/candidates/import \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "name": "John Doe", "email": "john@example.com", "role": "Backend Engineer", "projectId": "PROJ_ID" },
      { "name": "Jane Smith", "email": "jane@example.com", "role": "Backend Engineer", "projectId": "PROJ_ID" }
    ]
  }'
```
Response: `{ "imported": 2, "candidates": [...] }`

**Score a candidate** (auto or manual):
```bash
# Auto-score based on project criteria
curl -X POST http://localhost:3000/api/candidates/CAND_ID/score

# Manual score override
curl -X POST http://localhost:3000/api/candidates/CAND_ID/score \
  -H "Content-Type: application/json" \
  -d '{ "score": 85, "reason": "Strong technical background" }'
```
Auto-scoring evaluates: skills match, experience, education, culture fit, communication.

**Batch score** (scores all unscored candidates):
```bash
curl -X POST http://localhost:3000/api/candidates/batch-score
```
Response: `{ "scored": 12 }`

**Move candidate stage**:
```bash
curl -X PUT http://localhost:3000/api/candidates/CAND_ID/stage \
  -H "Content-Type: application/json" \
  -d '{ "stage": "Technical" }'
```
Records stage history with timestamps.

**Export candidates as CSV**:
```bash
curl "http://localhost:3000/api/candidates/export?projectId=PROJ_ID" -o candidates.csv
```

### Integrations (ATS)

Supported platforms: Greenhouse, Lever, Workable, BambooHR, Ashby, SmartRecruiters.

**List integrations** (API keys masked):
```bash
curl http://localhost:3000/api/integrations
```

**Configure an integration**:
```bash
curl -X POST http://localhost:3000/api/integrations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "greenhouse",
    "apiKey": "your-api-key",
    "enabled": true
  }'
```
For Workable/BambooHR, also include `"subdomain": "yourcompany"`.

**Test connection**:
```bash
curl -X POST http://localhost:3000/api/integrations/greenhouse/test
```
Response: `{ "ok": true, "message": "Connection successful" }`

**Sync candidates from platform**:
```bash
curl -X POST http://localhost:3000/api/integrations/greenhouse/sync
```

### Scoring Criteria

**Get scoring weights**:
```bash
curl http://localhost:3000/api/scoring
```
Response: `{ "weights": { "skillsMatch": 8, "experience": 7, "education": 5, "cultureFit": 6, "communication": 5 } }`

**Update scoring weights**:
```bash
curl -X PUT http://localhost:3000/api/scoring \
  -H "Content-Type: application/json" \
  -d '{ "weights": { "skillsMatch": 10, "experience": 8, "education": 3, "cultureFit": 7, "communication": 4 } }'
```

### Dashboard

**Get dashboard overview**:
```bash
curl http://localhost:3000/api/dashboard
```
Response:
```json
{
  "activeRoles": 3,
  "totalCandidates": 50,
  "unscored": 12,
  "stageDistribution": { "Sourced": 20, "Screen": 15, "Technical": 8, "Onsite": 5, "Offer": 2 },
  "sourceDistribution": { "linkedin": 25, "referral": 10, "manual": 15 },
  "integrationStatus": [{ "platform": "greenhouse", "syncStatus": "synced", "lastSync": "..." }],
  "recentActivity": [...]
}
```

### Activity Log

**Get activity log**:
```bash
curl http://localhost:3000/api/activity
curl "http://localhost:3000/api/activity?limit=10"
```
Response: Array of `{ id, action, details, timestamp }` objects (newest first, max 500).
