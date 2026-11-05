export function canvasPointFromViewport(point, geometry) {
  return { x: (point.x - geometry.left) / geometry.scaleX, y: (point.y - geometry.top) / geometry.scaleY };
}

export function viewportPointFromCanvas(point, geometry) {
  return { x: geometry.left + point.x * geometry.scaleX, y: geometry.top + point.y * geometry.scaleY };
}

export function quickEditorPositionKey(dashboardId, pageId, selection = {}) {
  return JSON.stringify([dashboardId, pageId, selection.kind,
    selection.placementId ?? selection.sectionId ?? selection.chronoGroupId ?? selection.pageId ?? dashboardId]);
}

export function quickEditorCanvasGeometry(element) {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top,
    scaleX: element.offsetWidth ? rect.width / element.offsetWidth : 1,
    scaleY: element.offsetHeight ? rect.height / element.offsetHeight : 1 };
}

/** Called only for a real canvas/window resize, never for ordinary scrolling. */
export function recoverQuickEditorPosition(position, geometry, viewportWidth) {
  const screen = viewportPointFromCanvas(position, geometry);
  const x = Math.max(12, Math.min(screen.x, viewportWidth - 52));
  return canvasPointFromViewport({ x, y: screen.y }, geometry);
}
