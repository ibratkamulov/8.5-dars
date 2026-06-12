import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeStr } = await params;
  const size = parseInt(sizeStr) || 192;
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.34);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#13cf5f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: "#0a1a0f",
            fontSize,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            fontFamily: "sans-serif",
          }}
        >
          FR
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
