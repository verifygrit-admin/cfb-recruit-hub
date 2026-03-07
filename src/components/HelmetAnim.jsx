import { useEffect, useRef } from "react";

const W = 200, H = 250;

export default function HelmetAnim({ targetId, onDone }) {
  const elRef     = useRef(null);
  const onDoneRef = useRef(onDone);
  const started   = useRef(false);

  // Keep ref current without re-triggering effect
  onDoneRef.current = onDone;

  useEffect(() => {
    // Guard: run only once even under React StrictMode double-invocation
    if (started.current) return;
    started.current = true;

    const el = elRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    el.style.left      = `${vw / 2 - W / 2}px`;
    el.style.top       = `${vh / 2 - H / 2}px`;
    el.style.display   = "block";
    el.style.animation = "helmetReveal 2.8s ease forwards";

    function onAnimEnd() {
      // Clear the CSS animation — fill-mode:forwards would otherwise block the JS transition
      el.style.animation = "none";
      el.style.display   = "block"; // keep visible now that .active class equiv is removed
      void el.offsetHeight;         // force reflow to register the cleared animation

      const btn = document.getElementById(targetId);
      if (!btn) {
        onDoneRef.current?.();
        return;
      }

      const br = btn.getBoundingClientRect();
      const dx = (br.left + br.width  / 2) - (vw / 2);
      const dy = (br.top  + br.height / 2) - (vh / 2);

      // Double rAF: ensures repaint before transition starts
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = "transform 1.1s cubic-bezier(0.25,0.1,0.6,1), opacity 0.5s ease 0.6s";
        el.style.transform  = `translate(${dx}px, ${dy}px) scale(0.12)`;
        el.style.opacity    = "0";
      }));

      setTimeout(() => onDoneRef.current?.(), 1300);
    }

    el.addEventListener("animationend", onAnimEnd, { once: true });
    // No cleanup needed — { once: true } self-removes; started.current prevents re-run
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={elRef} className="helmet-anim" aria-hidden="true">
      <img src="/helmet.png" alt="" draggable="false" />
    </div>
  );
}
