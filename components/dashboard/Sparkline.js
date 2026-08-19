"use client";

/**
 * Minimal inline sparkline — a thin polyline over a light area fill, no
 * axes/labels (the number next to it carries the value). Built as plain
 * SVG rather than pulling in chart.js for a single decorative line.
 */
export default function Sparkline({ values, color = "#0f9b8e", width = 100, height = 32 }) {
  const pts = Array.isArray(values) && values.length > 1 ? values : [0, 0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1);

  const coords = pts.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 4) - 2]);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
