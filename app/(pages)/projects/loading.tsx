import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mx-auto mt-24 min-h-screen max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="skeleton h-6 w-28" />
          <div className="skeleton h-8 w-52 rounded-lg" />
        </div>
        <div className="mb-10">
          <div className="skeleton h-28 w-full rounded" />
        </div>
        <ul className="stagger divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {Array.from({ length: 7 }).map((_, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-[85%]" />
                <div className="skeleton h-3 w-16" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="skeleton h-3 w-10" />
                <div className="skeleton h-3 w-14" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
