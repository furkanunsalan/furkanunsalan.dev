import TopProgressBar from "@/components/TopProgressBar";

// Scattered node hints for the fullscreen graph while it loads.
const NODES: [number, number, number][] = [
  [50, 50, 34],
  [34, 38, 20],
  [66, 40, 18],
  [42, 66, 16],
  [60, 68, 20],
  [26, 58, 12],
  [74, 60, 12],
  [40, 26, 12],
  [62, 24, 10],
  [22, 44, 9],
  [78, 46, 9],
  [50, 80, 11],
  [30, 74, 8],
  [70, 78, 8],
];

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="fixed inset-0 z-0 overflow-hidden bg-dark-primary">
        {NODES.map(([top, left, size], i) => (
          <div
            key={i}
            className="skeleton-circle absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
            }}
          />
        ))}
      </div>
    </>
  );
}
