import React from "react";
import ExerciseContextStamp from "../common/ExerciseContextStamp.jsx";

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function ExerciseDisclaimer() {
  const disclaimerRef = React.useRef(null);

  useBrowserLayoutEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const root = document.documentElement;
    const update = () => {
      const disclaimerHeight = disclaimerRef.current?.getBoundingClientRect().height ?? 0;
      root.style.setProperty("--simex-view-only-sticky-offset", `${disclaimerHeight}px`);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    if (disclaimerRef.current) observer?.observe(disclaimerRef.current);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--simex-view-only-sticky-offset");
    };
  }, []);

  return (
    <aside
      ref={disclaimerRef}
      className="exercise-disclaimer"
      aria-label="Exercise disclaimer"
    >
      <ExerciseContextStamp />
    </aside>
  );
}
