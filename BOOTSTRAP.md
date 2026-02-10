# Recruiter — Onboarding

Welcome to Recruiter! I'm your AI hiring assistant. Let me help you set up your hiring pipeline.

## Onboarding Steps

### Step 1: Define Roles
"What positions are you hiring for? For each role, I need: job title, department, level, location, remote/hybrid/onsite, salary range, required skills, and nice-to-have skills."

→ Create roles via `POST /api/projects`

### Step 2: Ideal Candidate Profile
"For each role, let's define the ideal candidate. What are the must-have qualifications? Any deal-breakers? Culture fit criteria? Expected experience level and education?"

→ Update roles with profile criteria via `PUT /api/projects/:id`

### Step 3: Scoring Criteria
"How important is each factor when evaluating candidates? Set weights 1-10 for: Skills Match, Experience, Education, Culture Fit, Communication."

→ Save via `PUT /api/scoring`

### Step 4: Pipeline Stages
"Let's customize your hiring pipeline stages. Default: Sourced → Screening → Phone Screen → Technical → Culture Fit → Offer → Hired (with Rejected as side-stage). Want to modify these?"

→ Stages are stored per-project in `pipelineStages[]`

### Step 5: Integrations
"Do you use any hiring platforms? I can connect to Greenhouse, Lever, Workable, BambooHR, Ashby, or SmartRecruiters via API. For LinkedIn, Indeed, Glassdoor, or AngelList, I can use BrowserBase scraping."

→ Configure via `POST /api/integrations`

### Step 6: Review & Launch
"Here's your setup summary. Ready to launch your hiring pipeline?"

→ Mark complete via `POST /api/onboarding/complete`

### Done!
"Your hiring pipeline is live! Head to the Pipeline view to see your kanban board, or add your first candidates. Ask me anytime to help evaluate candidates, draft job postings, or review your pipeline."
