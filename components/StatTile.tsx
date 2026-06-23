type StatTileProps = {
  value: string;
  label?: string;
};

export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 text-center shadow-sm">
      <div className="text-xl font-extrabold text-ink sm:text-2xl">{value}</div>
      {label ? <div className="mt-1 text-sm font-semibold text-slate-600">{label}</div> : null}
    </div>
  );
}
