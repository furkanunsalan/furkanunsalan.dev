import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
          <div className="skeleton h-10 flex-1 rounded-xl" />
          <div className="skeleton h-10 w-full sm:w-1/3 rounded-xl" />
        </div>
        <ul className="space-y-4 stagger">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="card p-3 sm:p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-4 w-12 rounded-full" />
                    <div className="skeleton h-4 w-16 rounded-full" />
                  </div>
                </div>
                <div className="skeleton h-4 w-4 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
