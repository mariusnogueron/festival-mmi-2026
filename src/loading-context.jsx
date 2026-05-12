/**
 * Suivi du chargement (THREE.DefaultLoadingManager via drei) et overlay plein écran.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProgress } from "@react-three/drei";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loadState, setLoadState] = useState({
    progress: 0,
    active: false,
    loaded: 0,
    total: 0,
  });
  const value = useMemo(() => ({ loadState, setLoadState }), [loadState]);
  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

function useLoadingApi() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("LoadingProvider est requis autour de l’application.");
  }
  return ctx;
}

/** À placer à l’intérieur de &lt;Canvas&gt; (utilise useProgress). */
export function LoadingReporter() {
  const { progress, active, loaded, total } = useProgress();
  const { setLoadState } = useLoadingApi();
  useEffect(() => {
    setLoadState({ progress, active, loaded, total });
  }, [progress, active, loaded, total, setLoadState]);
  return null;
}

const strokeBlack =
  "text-transparent [-webkit-text-stroke-width:2px] [-webkit-text-stroke-color:#0a0a0a] [paint-order:stroke_fill] sm:[-webkit-text-stroke-width:2.5px]";
const strokeWhite =
  "text-transparent [-webkit-text-stroke-width:2px] [-webkit-text-stroke-color:#fafafa] [paint-order:stroke_fill] sm:[-webkit-text-stroke-width:2.5px]";

function DigitStacks({ digits, clipLight, clipDark }) {
  const col = (strokeClass, keyPrefix) =>
    digits.map((ch, i) => (
      <div
        key={`${keyPrefix}-${i}`}
        className="flex min-h-0 flex-1 items-center justify-center px-0.5"
      >
        <span
          className={`-rotate-90 font-mono text-[clamp(2.25rem,14vh,5.5rem)] font-light leading-none tabular-nums ${strokeClass}`}
        >
          {ch}
        </span>
      </div>
    ));

  return (
    <>
      <div
        className="absolute inset-0 flex flex-col py-3 sm:py-4"
        style={{ clipPath: clipLight }}
        aria-hidden
      >
        {col(strokeBlack, "k")}
      </div>
      <div
        className="absolute inset-0 flex flex-col py-3 sm:py-4"
        style={{ clipPath: clipDark }}
        aria-hidden
      >
        {col(strokeWhite, "w")}
      </div>
    </>
  );
}

/** Chiffres du % en contour, tournés 90°, pleine hauteur à gauche ; le noir monte sous la même bande (zéro écart). */
export function LoaderOverlay() {
  const { loadState } = useLoadingApi();
  const { progress, active, loaded, total } = loadState;
  const [dismissed, setDismissed] = useState(false);
  const p = Math.min(100, Math.max(0, progress));
  const n = Math.round(p);
  const digitChars = [...String(n)].reverse();

  const loadFinished =
    !active &&
    (p >= 99 || (total > 0 && loaded >= total));

  useEffect(() => {
    if (!loadFinished) return undefined;
    const t = window.setTimeout(() => setDismissed(true), 500);
    return () => window.clearTimeout(t);
  }, [loadFinished]);

  useEffect(() => {
    const t = window.setTimeout(() => setDismissed(true), 45000);
    return () => window.clearTimeout(t);
  }, []);

  if (dismissed) return null;

  /** Zone claire au-dessus du niveau du noir → contours noirs. */
  const clipLight = `inset(0 0 ${p}% 0)`;
  /** Zone recouverte par le noir → contours blancs. */
  const clipDark = `inset(${100 - p}% 0 0 0)`;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[20000]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={n}
      aria-label={`Chargement ${n} pour cent`}
    >
      <div className="absolute inset-0 bg-neutral-100" aria-hidden />
      <div
        className="absolute bottom-0 left-0 right-0 bg-black transition-[height] duration-150 ease-out"
        style={{ height: `${p}%` }}
        aria-hidden
      />
      <div className="absolute inset-y-0 left-0 z-10 flex w-[4.25rem] sm:w-[5.25rem]">
        <DigitStacks
          digits={digitChars}
          clipLight={clipLight}
          clipDark={clipDark}
        />
      </div>
    </div>
  );
}
