import type { ReactNode } from "react";
import { Button } from "@/components/ui";

type LockedTeaserProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function LockedTeaser({ eyebrow = "Premium", title, description, children }: LockedTeaserProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="select-none p-6 blur-[2px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-xl rounded-3xl border border-brand/20 bg-white/95 p-6 text-center shadow-xl shadow-brand/10">
          <p className="rg-kicker">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
          <p className="mt-2 text-slate-700">{description}</p>
          <Button href="/upgrade" className="mt-5">
            Unlock your dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
