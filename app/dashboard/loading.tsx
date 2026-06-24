export default function DashboardLoading() {
  return (
    <div className="rg-page-shell" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xl space-y-4">
            <div className="h-4 w-40 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-12 w-full rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-5 w-64 rounded-full bg-slate-200 motion-safe:animate-pulse" />
          </div>
          <div className="h-14 w-52 rounded-xl bg-slate-200 motion-safe:animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rg-card min-h-[28rem] space-y-5">
            <div className="mx-auto h-48 w-48 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-6 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-6 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-6 rounded-full bg-slate-200 motion-safe:animate-pulse" />
          </div>
          <div className="rg-card-highlight min-h-[28rem] space-y-5">
            <div className="h-4 w-40 rounded-full bg-slate-300 motion-safe:animate-pulse" />
            <div className="h-10 rounded-2xl bg-slate-300 motion-safe:animate-pulse" />
            <div className="h-24 rounded-2xl bg-slate-300 motion-safe:animate-pulse" />
            <div className="h-14 rounded-xl bg-slate-300 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
