# Recruiter Tools — API Reference

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


## Browser & Screenshots (Playwright)

Playwright and Chromium are pre-installed. Use them for browsing websites, taking screenshots, scraping content, and testing.

```bash
# Quick screenshot
npx playwright screenshot --full-page https://example.com screenshot.png

# In Node.js
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://example.com");
await page.screenshot({ path: "screenshot.png", fullPage: true });
await browser.close();
```

Do NOT install Puppeteer or download Chromium — Playwright is already here and ready to use.


## File & Image Sharing (Upload API)

To share files or images with the user, upload them to the Emika API and include the URL in your response.

```bash
# Upload a file (use your gateway token from openclaw.json)
TOKEN=$(cat /home/node/.openclaw/openclaw.json | grep -o "\"token\":\"[^\"]*" | head -1 | cut -d\" -f4)

curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/path/to/file.png" | jq -r .full_url
```

The response includes `full_url` — a public URL you can send to the user. Example:
- `https://api.emika.ai/uploads/seats/f231-27bd_abc123def456.png`

### Common workflow: Screenshot → Upload → Share
```bash
# Take screenshot with Playwright
npx playwright screenshot --full-page https://example.com /tmp/screenshot.png

# Upload to API
TOKEN=$(cat /home/node/.openclaw/openclaw.json | grep -o "\"token\":\"[^\"]*" | head -1 | cut -d\" -f4)
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | jq -r .full_url)

echo "Screenshot: $URL"
# Then include $URL in your response to the user
```

Supported: images (png, jpg, gif, webp), documents (pdf, doc, xlsx), code files, archives. Max 50MB.
