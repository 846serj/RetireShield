import type { HTMLAttributes } from "react";

export function Eyebrow({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm font-extrabold uppercase tracking-[0.18em] text-accent ${className}`} {...props} />;
}
