# Skill: Grounded Interview & Skill-Match Generation

## Objective

Implement (or fix) any AI-generation feature in Resume Analyzer AI —
interview questions, skill-gap matching, ATS critique — so that every
specific claim is grounded in literal resume text, per the
`no-hallucination` Rule and `BRAIN.md`.

Use this Skill when the task involves:
- Generating interview practice questions from a resume + target role
- Generating matched/missing/recommended skills for skill-gap analysis
- Any new prompt that asks the AI to reference specific resume content

## Instructions

### 1. Locate the prompt builder

Find the server-side prompt construction for the feature in question.
Per `BRAIN.md`, this lives in `server/` — never in `client/`. Likely
candidates: `server/services/interviewPrompt.js`,
`server/services/skillGapPrompt.js`, or similarly named files.

### 2. Update the prompt to require source evidence

Every generated item (question, matched skill, critique point) must
include a `source_evidence` field: a verbatim substring copied from the
resume text that justifies the claim. Exempt only generic
behavioral/HR questions that aren't tied to a specific resume detail
(those use `source_evidence: null`).

Prompt instruction to add:

```
For each item you generate, include a "source_evidence" field containing
a VERBATIM substring copied exactly from the resume text that justifies
it. If no such substring exists, do not invent one — either generalize
the item so it no longer needs that claim, or omit the item entirely.
Do not infer specific tools, technologies, databases, or metrics that
are not literally present in the resume text, even if they are common
or plausible for this type of project.
```

Skill-gap prompts specifically: `matched_skills` must follow this rule.
`missing_skills` / `recommended_skills` are exempt — they're explicitly
gap-inference fields, not claims about the candidate. Label them
accordingly in the schema so the distinction is unambiguous to the model.

### 3. Add server-side validation (do not rely on the prompt alone)

Free-tier / smaller models will ignore "don't invent" instructions under
output-quality pressure. Create or update a validation module:

`server/services/groundingValidator.js`:

```javascript
function validateGrounded(items, sourceText, exemptCategories = []) {
  const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, ' ');
  const validated = [];
  const dropped = [];

  for (const item of items) {
    if (exemptCategories.includes(item.category) && !item.source_evidence) {
      validated.push(item);
      continue;
    }

    const evidence = item.source_evidence;
    if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 4) {
      dropped.push({ item, reason: 'missing or trivial source_evidence' });
      continue;
    }

    const normalizedEvidence = evidence.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalizedSource.includes(normalizedEvidence)) {
      dropped.push({ item, reason: 'source_evidence not found verbatim in source text' });
      continue;
    }

    validated.push(item);
  }

  return { validated, dropped };
}

module.exports = { validateGrounded };
```

Wire this into the generation flow immediately after JSON parsing and
before returning to the client. Log `dropped` items with their reasons —
this log is how you'll know if the model needs a stronger prompt, a
retry, or a different model entirely.

### 4. Add a retry-once-on-high-drop-rate guard

If more than half the generated items get dropped, regenerate once before
returning a thin result to the user. Do not retry more than once — if it
fails twice, return what validated successfully rather than looping.

### 5. Verification (Antigravity verification step)

After implementing, verify by:
1. Running the feature against the test resume + an implausible target
   role (e.g., a fresher resume vs. "Senior Product Manager") — confirm no
   invented tech stacks, databases, or named tools appear in the output.
2. Running it against a plausible target role for the same resume —
   confirm the drop rate is low and output quality doesn't degrade.
3. Checking the server logs for the drop-rate signal; if drop rate is
   consistently high (>30%) across many resumes, flag this back to the
   user as a model-capability issue, not a prompt issue — see
   `BRAIN.md` "Deployment" section re: current model
   `nvidia/nemotron-3-ultra-550b-a55b:free` and its lack of a configured
   fallback chain. Do not silently swap models without surfacing this.

## Do not

- Do not weaken or remove the `no-hallucination` Rule's constraints to
  make this Skill "pass" more easily.
- Do not add a fit-plausibility gate (blocking implausible role targets)
  as part of this Skill — that's a separate, larger product decision not
  in scope here. Flag it, don't build it silently.
- Do not bypass `server/` and call the AI provider directly from
  `client/` — this violates BRAIN.md's architecture rule regardless of
  how convenient it seems for this fix.