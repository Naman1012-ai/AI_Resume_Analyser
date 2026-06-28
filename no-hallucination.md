---
name: no-hallucination
description: Enforces BRAIN.md's core AI constraint across all resume-analysis features. Always active for this project.
trigger: always_on
---

# Rule: No Hallucinated Resume Content

This project's source of truth is `BRAIN.md` at the repo root. This Rule
encodes its non-negotiable constraint:

> The AI must never: Invent experience, Invent projects, Invent companies,
> Invent skills. If information is unavailable: State that it is
> unavailable. Do not hallucinate.

## What this means in practice for every AI-generated feature

Any feature that generates AI output based on a resume — ATS analysis,
skill-gap matching, interview question generation, resume comparison,
career insights — must satisfy ALL of the following before output is
returned to the user:

1. **Every claim about what the candidate has done, knows, or used must be
   traceable to literal text in the resume.** Synonyms are fine (e.g.
   "JS" / "JavaScript"). Inference from project descriptions to specific
   unnamed tools, technologies, or metrics is NOT fine — if the resume says
   "built a dashboard" you may not assert the candidate used a specific
   named tool (Jira, Figma, Mixpanel, etc.) unless that tool is literally
   named in the resume text.

2. **Gap analysis (missing skills, recommended skills, ATS weaknesses) is
   exempt from rule 1** — these are explicitly framed as things the
   candidate does NOT have, inferred from the target role's typical
   requirements. This is the one place inference is allowed, because the
   output is honestly labeled as a gap, not a claim about the candidate.

3. **Any AI-generated question, critique, or score component that
   references a specific resume detail must be checked against the literal
   resume text before being shown to the user.** If no matching text
   exists, drop that detail and either generalize the output or omit it
   entirely. Do not let the model "fill in" a plausible-sounding specific
   (a tech stack, a database choice, a metric, a tool name) that was never
   actually stated.

4. **When a target role is implausible for the candidate's apparent level
   (e.g., a first-year undergrad with no work history scored against a
   senior PM role), the system must not generate a falsely authoritative
   verdict in recruiter-voice.** This is currently an open gap in the
   pipeline — see `BRAIN.md` "AI Modification Rules" before touching this;
   do not silently add a fit-blocking gate without a product decision, but
   any new analysis prompt should avoid confident recruiter-toned language
   ("results in a limited fit for X role") when the underlying match
   confidence is low.

## Where this is enforced in code

See `.agent/skills/grounded-interview-generation/SKILL.md` for the concrete
implementation pattern (verbatim source-evidence requirement + server-side
validation). Any new AI-generation feature added to this project should
follow the same pattern: generate with evidence fields, validate server-side,
drop ungrounded output, log the drop rate.

## Relationship to BRAIN.md

This Rule is a operationalization of BRAIN.md's "AI Rules" and "Prompt
Design Principles" sections. If BRAIN.md is updated, this Rule should be
updated to match. If they ever conflict, BRAIN.md is the source of truth
per its own header.
