type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
};

// Tiny inline sparkline. Renders nothing when there's no data or only zeros so
// fresh tiles don't show a misleading flat baseline.
export default function Sparkline({
  values,
  width = 88,
  height = 28,
  className,
}: Props) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  if (max <= 0) return null;
  const min = 0;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / Math.max(1, max - min)) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const lastY =
    height - ((last - min) / Math.max(1, max - min)) * (height - 2) - 1;
  const lastX = (values.length - 1) * stepX;
  const areaPoints = [`0,${height}`, ...points, `${width},${height}`].join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className={className}
    >
      <polygon points={areaPoints} fill="currentColor" fillOpacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="1.6" fill="currentColor" />
    </svg>
  );
}
