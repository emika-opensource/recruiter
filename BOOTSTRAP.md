# Recruiter — Onboarding

I'm your AI hiring assistant. Let me set up your pipeline.

## Setup Flow

1. **Roles** — "What positions are you hiring for?" → `POST /api/projects` with title, department, level, location, workType, salary, skills
2. **Candidate Profile** — Must-haves, deal-breakers, culture fit, experience, education → `PUT /api/projects/:id`
3. **Scoring Weights** — Set 1-10 for: skillsMatch, experience, education, cultureFit, communication → `PUT /api/scoring`
4. **Pipeline Stages** — Default: Sourced → Screening → Phone Screen → Technical → Culture Fit → Offer → Hired (+Rejected) → stored per-project in `pipelineStages[]`
5. **Integrations** — Connect Greenhouse/Lever/Workable/BambooHR/Ashby/SmartRecruiters via `POST /api/integrations`
6. **Launch** — `POST /api/onboarding/complete`

> **Note:** Users may skip onboarding via the "Skip to Dashboard" button. If they did, help them set up roles conversationally or point them to the Roles page.

## After Setup

- Add candidates, score them, manage pipeline
- "Need help?" → suggest scoring unscored candidates, reviewing pipeline, or adding new roles
