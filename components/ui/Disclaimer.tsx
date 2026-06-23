import type { HTMLAttributes } from "react";

export function Disclaimer({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-slate-300 bg-white p-4 text-base leading-relaxed text-slate-700 ${className}`} {...props}>
      <strong className="font-bold text-ink">Important:</strong>{" "}
      {children ?? "RetireShield provides educational information only and is not financial, tax, legal, or investment advice."}
    </div>
  );
}
