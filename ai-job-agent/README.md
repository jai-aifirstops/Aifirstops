# AI Job Application Automation Agent

Local-first Python agent that helps **Jaideep Ponnam** discover, score, prepare, and track AI engineering job applications — with strict truthfulness rules and human approval gates.

> Lives under `ai-job-agent/`. It does **not** modify the Nova Market Next.js app.

## Setup

```bash
cd ai-job-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Optional API keys (live discovery later): copy `.env.example` → `.env`.

## Candidate onboarding (required first)

### 1) Place your resume

Put one resume file in:

```text
ai-job-agent/resumes/master/
```

Supported formats:

- PDF (`.pdf`)
- Word (`.docx`)
- Markdown (`.md` / `.markdown`)
- Plain text (`.txt` / `.text`)

### 2) Import

Auto-detect when exactly one resume exists:

```bash
python -m src.cli import-resume --auto
```

Or pass an explicit path:

```bash
python -m src.cli import-resume "resumes/master/JXTG RES.pdf"
python -m src.cli import-resume --dry-run --auto
```

Import extracts contact, education, experience, projects/leadership, skills, certifications, and measurable accomplishments. Every fact stores:

- source filename
- source section
- original supporting text
- confidence
- verification status

Uncertain fields are marked `requires_user_confirmation` (never invented).

### 3) Review facts

Interactive:

```bash
python -m src.cli review-profile
```

Actions per fact: approve / correct / reject / private / toggle resume-use / record missing info.

Scriptable helpers:

```bash
python -m src.cli review-profile --list-only
python -m src.cli review-profile --approve-all-pending --mark-approved
python -m src.cli review-profile --add-skill "LangChain"
```

### 4) Validate readiness

```bash
python -m src.cli validate-profile
```

Reports missing required fields, conflicting dates, duplicate skills, unsupported claims, unverified metrics, empty experience descriptions, and a readiness percentage.

### 5) Daily run

```bash
python -m src.cli daily-run --dry-run
```

`daily-run` will **not** generate tailored resumes until:

- resume imported
- profile reviewed
- profile approved
- at least one experience exists

## Other commands

```bash
python -m src.cli initialize-profile
python -m src.cli discover-jobs
python -m src.cli analyze-jobs
python -m src.cli prepare-application --job-id JOB_ID
python -m src.cli show-approval-queue
python -m src.cli approve --action-id ACTION_ID
python -m src.cli mark-applied --job-id JOB_ID --confirm
python -m src.cli prepare-interview --job-id JOB_ID
python -m src.cli weekly-review
```

## Safety model

| Level | Examples | Behavior |
|------|----------|----------|
| 1 | parse, score, draft, report | Automatic |
| 2 | finalize resume use, outreach send intent, salary/sponsorship answers | Approval required |
| 3 | submit application, send email/LinkedIn, accept offer | Never automatic |

## Tests

```bash
cd ai-job-agent
pytest -q
```

## Configuration

| File | Purpose |
|------|---------|
| `config/candidate_profile.yaml` | Identity, auth notes, review/approval flags |
| `candidate/*.yaml` | Verified experience/skills/projects/achievements/certs |
| `config/job_preferences.yaml` | Filters and thresholds |
| `config/scoring_rules.yaml` | Match weights |
| `config/search_sources.yaml` | Discovery sources |

## What is intentionally not automated yet

- Live Adzuna / SerpAPI connectors (config hooks present)
- Browser form filling / CAPTCHA / LinkedIn messaging
- Automatic application submission (never)
