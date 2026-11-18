import React from "react";

export default function CompactCrownDisclosure({
  id = "crown-disclosure",
  open,
  onClose,
  pageActions,
  children,
}) {
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector("button, a, [tabindex]")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <>
    <div className="crown-disclosure-backdrop" aria-hidden="true" onClick={onClose} />
    <section id={id} ref={panelRef} className="crown-disclosure" aria-label="Dashboard modes and tools">
      {children}
      {pageActions && <div className="crown-disclosure__actions" onClick={(event) => {
        if (event.target.closest("button:not(:disabled)")) onClose?.();
      }}>{pageActions}</div>}
    </section>
    </>
  );
}
