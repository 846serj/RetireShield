import { ScoreGauge } from "@/components/ScoreGauge";
import { SubScoreBar } from "@/components/SubScoreBar";
import { Button, Container, Disclaimer, Eyebrow, SectionBand } from "@/components/ui";

const tokens = [
  ["brand", "#1D4E89", "bg-brand"],
  ["brand-dark", "#163A66", "bg-brand-dark"],
  ["accent", "#2E7D5B", "bg-accent"],
  ["alert", "#C77700", "bg-alert"],
  ["danger", "#B23A3A", "bg-danger"],
  ["ink", "#1A2230", "bg-ink"],
  ["surface", "#F7F9FC", "bg-surface"],
  ["band", "#EEF3F9", "bg-band"],
  ["score.secure", "#2E7D5B", "bg-score-secure"],
  ["score.mostlySecure", "#4F9E6A", "bg-score-mostlySecure"],
  ["score.atRisk", "#C77700", "bg-score-atRisk"],
  ["score.vulnerable", "#B23A3A", "bg-score-vulnerable"],
];

export default function StyleguidePage() {
  return (
    <div className="py-10 sm:py-14">
      <Container>
        <Eyebrow>Design system</Eyebrow>
        <h1 className="mt-3 text-4xl sm:text-5xl">RetireShield styleguide</h1>
        <p className="mt-5 max-w-3xl text-xl text-slate-700">
          Inter is used for UI text, Source Serif 4 is used for headings, and the base body size is 18px with a 1.5 line height.
        </p>
      </Container>

      <Container className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tokens.map(([name, hex, swatch]) => (
          <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`h-20 rounded-xl border border-black/10 ${swatch}`} />
            <div className="mt-3 font-bold text-ink">{name}</div>
            <div className="text-base text-slate-600">{hex}</div>
          </div>
        ))}
      </Container>

      <SectionBand className="mt-12">
        <Container>
          <Eyebrow>Components</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">Buttons and content bands</h2>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Button href="/styleguide">Primary button</Button>
            <Button href="/styleguide" variant="secondary">Secondary button</Button>
            <Button href="/styleguide" variant="ghost">Ghost button</Button>
          </div>
          <Disclaimer className="mt-8 max-w-3xl">
            This disclaimer component is designed for plain-language notices while preserving readable contrast.
          </Disclaimer>
        </Container>
      </SectionBand>

      <Container className="mt-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <Eyebrow>Score components</Eyebrow>
            <h2 className="mt-3 text-3xl">Animated safety score gauge and sub-score bars</h2>
            <p className="mt-4 text-slate-700">
              The gauge and bars use the Phase 1 score band tokens and keep the scoring display educational, plain-English, and non-advisory.
            </p>
            <div className="mt-7 space-y-5">
              <SubScoreBar label="Guaranteed income" value={86} scoreKey="income" />
              <SubScoreBar label="Spending sustainability" value={58} scoreKey="withdrawal" caption="Optional captions can replace the default education blurb." />
              <SubScoreBar label="Inflation exposure" value={42} scoreKey="inflation" />
              <SubScoreBar label="Market-drop cushion" value={28} scoreKey="market" />
            </div>
          </div>
          <ScoreGauge value={82} band="Secure" delta="+6 this month" />
        </div>
      </Container>

      <Container className="mt-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Eyebrow>Container</Eyebrow>
          <h2 className="mt-3 text-3xl">1120px max width with responsive padding</h2>
          <p className="mt-4 max-w-2xl text-slate-700">
            This panel sits inside the shared Container component. Use keyboard tabbing on this page to verify the global focus ring.
          </p>
        </div>
      </Container>
    </div>
  );
}
