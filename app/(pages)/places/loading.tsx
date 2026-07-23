import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mx-auto mb-16 mt-24 max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="skeleton h-6 w-24" />
          <div className="flex gap-2">
            <div className="skeleton h-7 w-16 rounded-full" />
            <div className="skeleton h-7 w-20 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-[380px] w-full rounded-xl" />
        <ul className="mt-6 space-y-3 stagger">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="skeleton-circle mt-1 h-3 w-3 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
