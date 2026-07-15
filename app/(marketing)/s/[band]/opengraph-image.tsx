import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { scoreBandFromSlug, scoreBandHumanLabel } from "@/lib/shareBands";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgImageProps = { params: { band: string } };

export default function Image({ params }: OgImageProps) {
  const bandLabel = scoreBandFromSlug(params.band);
  if (!bandLabel) notFound();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#F3F8FC", display: "flex", padding: 72, color: "#1A2230" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 44, background: "white", border: "2px solid #D8E7F3", padding: 64, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 42, fontWeight: 800, color: "#163A66" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#1D4E89" }} />
            RetireShield
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2, color: "#1D4E89", textTransform: "uppercase" }}>
              Free retirement checkup
            </div>
            <div style={{ marginTop: 24, fontSize: 74, fontWeight: 800, lineHeight: 1.05, color: "#1A2230" }}>
              {scoreBandHumanLabel(bandLabel)}
            </div>
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#163A66" }}>Take the free 9-question quiz</div>
        </div>
      </div>
    ),
    size,
  );
}
