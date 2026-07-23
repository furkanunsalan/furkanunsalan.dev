import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mx-auto mt-24 flex w-full max-w-3xl flex-col items-start px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex w-full flex-col items-start gap-6 sm:flex-row sm:gap-8">
          {/* ascii portrait */}
          <div className="skeleton h-52 w-full shrink-0 rounded-lg sm:h-56 sm:w-48" />
          {/* info card */}
          <div className="min-w-0 flex-1 space-y-2.5 pt-1">
            {[70, 55, 60, 45, 65, 50, 40, 30].map((w, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-3 w-16 shrink-0" />
                <div className="skeleton h-3" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-8 pb-16">
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-[96%]" />
            <div className="skeleton h-4 w-[90%]" />
            <div className="skeleton h-4 w-[70%]" />
          </div>
          <div className="w-full space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-28 w-full rounded" />
          </div>
        </div>
      </div>
    </>
  );
}
