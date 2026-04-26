import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3 mb-8 stagger">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-5 w-12" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mb-8 gap-3">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-32 flex flex-row overflow-hidden">
              <div className="skeleton w-2/5 h-full rounded-none" />
              <div className="flex-1 flex flex-col p-3 space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="mt-auto flex items-center justify-between">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-4 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
