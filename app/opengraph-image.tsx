import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Furkan Ünsalan — Software Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          color: "#ffffff",
          padding: "72px",
          position: "relative",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* indigo accent glow in the corner */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(99,102,241,0.22)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -180,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(99,102,241,0.10)",
            filter: "blur(80px)",
          }}
        />

        {/* top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#71717a",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: "#6366f1",
            }}
          />
          furkanunsalan.dev
        </div>

        {/* title */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            Furkan Ünsalan
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#d4d4d4",
              fontWeight: 300,
            }}
          >
            Software Developer · Istanbul
          </div>
        </div>

        {/* bottom bar */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#71717a",
            fontSize: 22,
          }}
        >
          <span>Writing · Projects · Photos · Experience</span>
          <span style={{ color: "#6366f1" }}>›</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
