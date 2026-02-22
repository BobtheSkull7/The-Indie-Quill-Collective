import { useEffect, useRef } from "react";

export function useActivityTracker() {
  const isActiveRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const markActive = () => {
      isActiveRef.current = true;
    };

    window.addEventListener("mousemove", markActive);
    window.addEventListener("keydown", markActive);
    window.addEventListener("click", markActive);
    window.addEventListener("scroll", markActive);

    intervalRef.current = setInterval(async () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        try {
          await fetch("/api/student/activity-heartbeat", { method: "POST" });
        } catch {}
      }
    }, 60000);

    return () => {
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("click", markActive);
      window.removeEventListener("scroll", markActive);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
