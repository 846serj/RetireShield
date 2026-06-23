import type { HTMLAttributes } from "react";

export function SectionBand({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`bg-band py-12 sm:py-16 lg:py-20 ${className}`} {...props} />;
}
