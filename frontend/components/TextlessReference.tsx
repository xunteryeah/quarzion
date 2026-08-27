"use client";

import { type ReactNode, useEffect, useRef } from "react";

export function TextlessReference({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    for (const link of container.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("/ui-reference")) continue;
      link.setAttribute("href", href === "/" ? "/ui-reference" : `/ui-reference${href}`);
    }
  }, []);

  return <div className="textless-reference" ref={root}>{children}</div>;
}
