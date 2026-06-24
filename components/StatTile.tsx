type StatTileProps = {
  value: string;
  label?: string;
};

export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-[18px] py-[14px] text-center shadow-sm">
      <div className="whitespace-nowrap text-base font-extrabold leading-6 text-ink sm:text-lg">{value}</div>
      {label ? <div className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-600">{label}</div> : null}
    </div>
  );
}
