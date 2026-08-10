---
name: creating-reference-driven-icons
description: Create faithful code-native SVG interface icons from supplied visual references. Use when implementing or revising icons whose silhouette, proportions, component anatomy, negative space, styling, or small-size legibility must remain visually traceable to a reference image.
---

# Creating Reference-Driven Icons

## Core principle

Keep the supplied image as the acceptance criterion throughout the task. Written descriptions, SVG coordinates, tests, and project conventions support the comparison; none replace the reference.

## Required workflow

1. Inspect a tightly cropped reference. Record an anatomy ledger covering silhouette, components, relative proportions, junctions, negative space, orientation, and alignment.
2. Establish the adaptation boundary. Unless the user says otherwise, adapt color and optical weight to the project while preserving geometry and recognizable anatomy.
3. Build a complete standalone SVG candidate. Do not edit canonical icon metadata, generated atlases, or application code yet.
4. Generate a comparison report:

   ```text
   node <skill-directory>/scripts/compare-icon.mjs \
     --reference <reference.png> \
     --candidate <candidate.svg> \
     --output <comparison.html>
   ```

   Use `--threshold 0..255` only when an opaque high-contrast reference needs different foreground separation.
5. Inspect the same-scale pair, 50% overlay, silhouette difference, and 16/24/192px previews. Report remaining differences under: silhouette, proportions, anatomy, negative space, alignment, optical weight, and small-size reading.
   - A generated but unrendered HTML report is not visual evidence. If the environment cannot display it, rasterize the candidate for a preliminary raw-reference comparison, disclose the missing overlay/difference inspection, and keep integration blocked until the report is viewed by the agent or user.
6. Revise the standalone candidate when a structural discrepancy remains. Regenerate the report after each geometry change.
7. Show the comparison to the user and obtain visual approval. Only then integrate the candidate and run the smallest project-specific checks that can falsify that integration.

## Fidelity gates

- Reject a generic icon that merely communicates the same concept.
- Preserve distinctive collars, joints, folds, openings, tapers, and internal elements before simplifying for a small viewbox.
- Compare the candidate directly with the reference, not only among other application icons.
- If foreground detection fails, request a transparent or higher-contrast crop, or adjust the threshold. Do not silently omit the difference view.
- Treat small-size legibility as a separate optical check; it cannot excuse a structurally different enlarged silhouette.

## Project profiles

Read a project profile when one exists. In SimEx Dashboard, read [references/simex-icon-profile.md](references/simex-icon-profile.md) before constructing or integrating a candidate. Keep project paths and style contracts in profiles so this skill can later move to user scope unchanged.

## Common mistakes

| Mistake | Correction |
|---|---|
| Turning the reference into a prose checklist and validating only the checklist | Keep the image in every comparison cycle |
| Simplifying before identifying anatomy | Record landmarks and proportions first |
| Installing a plausible first draft in canonical metadata | Keep it standalone until visual approval |
| Calling a contact sheet a reference comparison | Produce a same-scale pair, overlay, and difference view |
| Using string tests as proof of visual fidelity | Use tests only for integration and deterministic tooling |
