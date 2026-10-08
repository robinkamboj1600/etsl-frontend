import * as React from "react";

import { cn } from "@/lib/utils";

/** A small product photo that never changes the row's width; an empty tile when there is none. */
export function Thumb({ src, className }) {
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [src]);
  const box = cn("shrink-0 rounded-md border bg-muted", className);
  if (!src || broken) return <span className={box} aria-hidden="true" />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn(box, "object-cover")}
    />
  );
}
