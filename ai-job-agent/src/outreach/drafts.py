"""Draft personalized outreach messages — never send without approval."""

from __future__ import annotations

from src.models.candidate import CandidateProfile
from src.models.job import JobPosting


def draft_outreach_bundle(job: JobPosting, profile: CandidateProfile) -> dict[str, str]:
    name = profile.preferred_name or profile.full_name.split()[0]
    edu = profile.education[0].institution if profile.education else "my graduate program"

    connection = (
        f"Hi — I'm {name}, an aspiring AI engineer (M.S. CS, {edu}) based in "
        f"{profile.location_city or 'Austin'}. I came across the {job.title} role at "
        f"{job.company} and would value connecting to learn more about the team’s AI work."
    )

    referral = (
        f"Hi — I'm applying for the {job.title} role at {job.company}. I have an M.S. in "
        f"Computer Science and am focused on production AI/ML systems. If you think I might "
        f"be a fit after reviewing my background, I’d be grateful for any referral guidance — "
        f"no pressure either way. Thank you!"
    )

    recruiter = (
        f"Hi — I’m {name}. I’m very interested in the {job.title} opening at {job.company}. "
        f"I’m based in {profile.location_city or 'Austin'}, targeting full-time AI engineering "
        f"roles, and would welcome a brief conversation if you’re open to it."
    )

    hiring_manager = (
        f"Hi — I’m {name}, targeting AI engineering roles focused on building reliable "
        f"production systems. The {job.title} role stood out because of its emphasis on "
        f"applied AI. I’d welcome the chance to share how my background may help the team."
    )

    follow_up = (
        f"Hi — I recently applied for the {job.title} role at {job.company} and wanted to "
        f"reiterate my interest. Happy to share more detail on relevant projects or make time "
        f"for a conversation. Thank you for your consideration."
    )

    thank_you = (
        f"Thank you for taking the time to speak with me about the {job.title} role at "
        f"{job.company}. I enjoyed learning more about the team’s work and remain very "
        f"interested. Please let me know if I can provide anything else."
    )

    return {
        "connection_request": connection,
        "referral_request": referral,
        "recruiter_introduction": recruiter,
        "hiring_manager_introduction": hiring_manager,
        "follow_up_after_applying": follow_up,
        "thank_you_after_interview": thank_you,
    }
