---
description: Independent clean-context critique of a design doc, with findings triage
argument-hint: <path-to-design-doc>
---
Target: $ARGUMENTS (if empty, the current design doc)

1. Launch the `critic` subagent:
   - L2: once, lens `combined`.
   - L1: three in parallel, lenses `attack`, `premortem`, `facts`.
   The prompt to each is ONLY: "Lens: <lens>. Document: <path>." No summary, no reasoning, no hints, no report format. Independence from your view is the point, and this overrides any general rule you have about how to write subagent prompts.
2. Do not edit the design doc until the user has seen the findings and decided — even if they said "fix everything" earlier. Save the findings to docs/reviews/<doc-name>-review.md as one table:
   ID | Severity | Finding | Evidence | Your assessment | Decision
   Merge duplicates.
3. For Critical and High findings only, check each against the document and the code: Confirmed / Refuted (with evidence) / Needs user. You wrote this document and are biased toward defending it — no evidence, no "Refuted".
4. Present to the user, in the language of the conversation:
   - L2: one table of Critical and High; Medium and Low only as a count with a link to the file.
   - L1: Critical and High one at a time, then the rest as a list.
   For each: fix / reject / later. The user decides; never apply or drop a finding silently.
5. Record decisions in the review file, then update the design doc.
6. L1 only: if a Critical finding changed the design, offer one more pass with lens `attack` on the updated doc. No further rounds.

<!-- planning-framework -->
