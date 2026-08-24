---
sketch: 022
name: image-authoring
question: "How should Image creation and editing separate saved nondestructive transforms from transient viewer zoom while preserving asset recovery and accessibility?"
status: Proposed for V3 Design approval
winner: "A — Canvas + Transform Inspector (recommended)"
tags: [static-content, image, crop, rotation, alt-text, assets, build]
---

# Sketch 022: Image authoring

## Design question

How should the existing Image type gain creation through a separate static-content wizard, plus ordinary replacement and editing, without confusing saved authoring state with viewer-only zoom and pan?

## How to view

Open `.planning/sketches/022-image-authoring/index.html` in a browser.

## Variants

- **A: Canvas + Transform Inspector — recommended.** A large crop canvas and explicit saved-transform inspector coexist. Viewer zoom is shown in a separate preview strip.
- **B: Guided Tool Sections — rejected.** Source, accessibility, transform, and fit are stacked sequentially; simpler but the crop consequence is less continuously visible.
- **C: Focused Crop Dialog — rejected.** Crop becomes a nested task; clearer at small sizes but adds focus/recovery complexity and hides alt/fit consequences.

## Fixed contract

- Rotation is limited to 0°, 90°, 180°, and 270°.
- The existing six-stage Add chart workflow remains unchanged. Image moves into the separate four-stage Add static content workflow but retains its existing `image` type identity for migration.
- Saved crop is normalized integer permille `{x, y, width, height}` in the post-rotation coordinate space.
- Saved transforms never include transient View/fullscreen zoom or pan.
- Drag crop and pan have button and keyboard alternatives.
- Local uploads become durable dashboard assets; URLs remain linked and must show offline risk before save.
- Alt text is required unless the author explicitly marks the image decorative.
- Image is the only static-content type eligible for Present selection and passive Audience output. Free text is excluded.
- Replace, reset transforms, restore last saved, remove panel, and asset failure have different consequences.

## Rejection record

- **B** is rejected because the crop result and transform controls separate vertically at realistic editor density.
- **C** is rejected because a nested modal complicates draft recovery and makes image replacement, alt text, crop, and fit feel like independent saves when they must commit atomically.

Final acceptance belongs to the V3 Design master task.
