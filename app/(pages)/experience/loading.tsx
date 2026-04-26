import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 stagger">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="mb-8 pb-6 border-b border-white/[0.06] space-y-3"
            >
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-5 w-72" />
              <div className="skeleton h-4 w-48" />
              <div className="space-y-2 pt-2">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-[92%]" />
                <div className="skeleton h-3 w-[80%]" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="skeleton h-32 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
