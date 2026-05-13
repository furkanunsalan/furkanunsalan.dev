import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type OgFrameProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
};

export function renderOgImage({
  eyebrow,
  title,
  subtitle,
  footer,
}: OgFrameProps) {
  // Auto-shrink the title once it crosses a length threshold so long post
  // titles never overflow the 1200x630 frame.
  const titleSize =
    title.length > 80
      ? 60
      : title.length > 50
        ? 76
        : title.length > 28
          ? 92
          : 108;

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
          {eyebrow}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: titleSize,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
              display: "block",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 32,
                color: "#d4d4d4",
                fontWeight: 300,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

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
          <span>{footer ?? "furkanunsalan.dev"}</span>
          <span style={{ color: "#6366f1" }}>›</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
