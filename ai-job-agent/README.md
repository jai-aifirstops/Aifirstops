# AI Job Application Automation Agent

Local-first Python agent that helps **Jai deep Ponnam** discover, score, prepare, and track AI engineering job applications — with strict truthfulness and human approval gates.

> This project lives under `ai-job-agent/` inside the workspace. It does **not** modify the Nova Market Next.js app.

## What works in v0.1

- Project architecture + config schemas
- Candidate knowledge base (verified-only; empty experience until resume import)
- Job parser + normalization
- Deduplication (company/title/URL/description similarity)
- Match scoring (0–100) with hard rejects for citizenship/clearance/staff+ roles
- Application tracker CSV with safe status transitions
- Resume tailoring workflow (score ≥ 75) + claims/keyword/gap reports
- Application answer drafts with `REQUIRES USER CONFIRMATION` for legal fields
- Outreach drafts (never sent)
- Approval queue (Level 2 / Level 3)
- Daily + weekly report generators
- CLI (`python -m src.cli ...`)
- Unit tests for parsing, dedupe, scoring, claims, tracker

## What is intentionally not automated yet

- Live Adzuna / SerpAPI connectors (hooks + config present; disabled by default)
- PDF resume parsing (convert to Markdown/text first)
- Browser form filling / CAPTCHA / LinkedIn messaging
- Automatic application submission (never)

## Quick start

```bash
cd ai-job-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Validate profile + create tracker
python -m src.cli initialize-profile

# REQUIRED before real applications: import your resume (Markdown/text)
python -m src.cli import-resume /path/to/your_resume.md

# Offline demo using fixture jobs
python -m src.cli discover-jobs
python -m src.cli analyze-jobs
python -m src.cli daily-run --dry-run
```

## Important: resume status

At initialization, **no real resume was found in the workspace**. Only these facts were loaded:

- Name, preferred name, Austin TX location
- M.S. Computer Science, University of Memphis
- STEM OPT (reported)
- Target AI engineering roles / preferences

Employment history, projects, skills, and metrics are **empty** until you import a resume. The synthetic file under `tests/fixtures/sample_resume.md` is **test-only** and must not be used as your real resume.

## Daily workflow output

`daily-run` prints:

1. Daily Job Search Summary  
2. Top Opportunities  
3. Approval Queue  
4. Today’s Action Plan  

Reports are also written to `reports/daily/YYYY-MM-DD.md`.

## Approval model

- Drafting resumes/messages/reports → automatic  
- Using a resume, answering sponsorship/salary, sending outreach → **your approval**  
- Submitting applications / sending emails → **you do it**; then run `mark-applied --confirm`

## Configuration

| File | Purpose |
|------|---------|
| `config/candidate_profile.yaml` | Identity, education, auth notes, targets |
| `config/job_preferences.yaml` | Filters and thresholds |
| `config/scoring_rules.yaml` | Weights, penalties, keywords |
| `config/search_sources.yaml` | Discovery sources |

Optional API keys: copy `.env.example` → `.env`.

## Tests

```bash
cd ai-job-agent
pytest -q
```

## Suggested next inputs from you

1. Master resume as `.md` or `.txt` (PDF support later)  
2. Confirm email/phone and graduation date  
3. Confirm how you want sponsorship / STEM OPT questions answered  
4. Salary expectation range (stored only after you provide it)  
5. Whether to enable Adzuna/SerpAPI keys for live discovery  

## Recommended next command

```bash
python -m src.cli import-resume resumes/master/YOUR_RESUME.md
```
