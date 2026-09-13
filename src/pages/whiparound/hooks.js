import { useLayoutEffect, useRef, useState } from "react";

/* The size a box was actually given, in STAGE px.
 *
 * The Compose screens measure with BoxWithConstraints; this is that. clientWidth
 * and clientHeight are layout sizes, so the transform that scales the stage to
 * the monitor does not leak into the arithmetic — a row budget computed on a 4K
 * panel and on a 1080p one comes out identical, which is the point of the stage.
 *
 * Null until the first observation. Callers render nothing until then rather
 * than guessing, so a list never draws one frame with the wrong row count.
 */
export function useMeasuredSize() {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      setSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height ? prev : next,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}
