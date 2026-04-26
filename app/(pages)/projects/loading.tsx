import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="skeleton h-[140px] w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 stagger">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card p-4 flex justify-between items-start gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="skeleton h-5 w-1/3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-[80%]" />
                <div className="skeleton h-3 w-16 mt-2" />
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="skeleton h-3 w-10" />
                <div className="skeleton h-3 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
