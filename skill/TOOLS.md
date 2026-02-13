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
