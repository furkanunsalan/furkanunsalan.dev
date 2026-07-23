import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {[6, 5].map((count, zi) => (
            <section key={zi}>
              <div className="mb-5 flex items-center gap-3">
                <div className="skeleton h-3 w-28" />
                <span className="h-px flex-1 bg-white/[0.06]" />
                <div className="skeleton h-3 w-4" />
              </div>
              <div className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-white/[0.015] p-4 ring-1 ring-white/[0.08]"
                  >
                    <div className="flex h-16 items-center justify-center pt-2">
                      <div className="skeleton h-11 w-11 rounded-md" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="skeleton h-3 w-3/4" />
                      <div className="skeleton h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
