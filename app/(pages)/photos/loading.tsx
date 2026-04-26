import TopProgressBar from "@/components/TopProgressBar";

const COLUMNS = [
  [220, 320, 240, 360],
  [300, 200, 280, 340],
  [260, 380, 220, 300],
  [340, 240, 320, 200],
];

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 w-5/6 mx-auto pr-3">
        <div className="flex gap-3">
          {COLUMNS.map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-3">
              {col.map((h, i) => (
                <div
                  key={i}
                  className="skeleton w-full rounded-lg"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
