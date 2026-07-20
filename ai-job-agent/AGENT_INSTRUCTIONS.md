# Agent Instructions — AI Job Application Automation Agent

This document is the operating contract for any human or AI operator of this project.

## Mission

Help Jaideep Ponnam (preferred name: Jai) find, evaluate, prepare, organize, and track high-quality AI engineering job applications — without fabricating experience and without taking irreversible external actions.

## Absolute rules

1. **Truth only.** Never invent employers, projects, dates, degrees, skills, metrics, or responsibilities.
2. **Source everything.** Claims must cite resume/profile evidence in the knowledge base.
3. **Three claim types:**
   - `verified_fact` — allowed in applications
   - `reasonable_reframing` — allowed when the underlying fact is verified
   - `unsupported` — never appear in application materials
4. **No auto-submit.** Never submit applications, send messages, accept offers, or sign agreements.
5. **No auto legal answers.** Work authorization, sponsorship, demographics, disability, veteran status, salary history, and attestations require user confirmation.
6. **No CAPTCHA bypass.** Stop and ask the user.
7. **No secrets in code.** Use `.env` (see `.env.example`).
8. **Prefer quality over volume.** Strong, tailored applications beat mass apply.
9. **Sponsorship unclear ≠ reject.** Flag language for review.
10. **Citizenship / clearance / PR requirements** → reject/archive unless posting explicitly permits STEM OPT / current authorization.

## Safety levels

| Level | Examples | Behavior |
|------|----------|----------|
| 1 Automatic | parse, score, draft, report, local tracker updates | Allowed |
| 2 Approval required | finalize resume, outreach drafts to send, salary, sponsorship answers | Queue + wait |
| 3 Never automatic | submit application, send email/LinkedIn, accept offer, demographics | User only |

## Daily mode sequence

1. Review profile, tracker, follow-ups  
2. Discover → normalize → dedupe → filter  
3. Analyze / score  
4. Prepare strongest matches (analysis, resume if ≥75, answers, brief, outreach)  
5. Write `reports/daily/YYYY-MM-DD.md`  
6. Present approval queue + today’s action plan  

## Candidate data locations

- Profile: `config/candidate_profile.yaml`
- Verified experience: `candidate/verified_experience.yaml`
- Skills / projects / achievements: `candidate/*.yaml`
- Master resume: `candidate/master_resume.md` and `resumes/master/`

If `resume_imported` is false, do not treat applications as ready.  
If `profile_reviewed` / `profile_approved` are false, do not tailor resumes.

## Commands

```bash
cd ai-job-agent
python -m src.cli initialize-profile
python -m src.cli import-resume --auto
python -m src.cli review-profile
python -m src.cli validate-profile
python -m src.cli discover-jobs
python -m src.cli analyze-jobs
python -m src.cli prepare-application --job-id JOB_ID
python -m src.cli daily-run --dry-run
python -m src.cli show-approval-queue
python -m src.cli approve --action-id ACTION_ID
python -m src.cli mark-applied --job-id JOB_ID --confirm
python -m src.cli prepare-interview --job-id JOB_ID
python -m src.cli weekly-review
```
