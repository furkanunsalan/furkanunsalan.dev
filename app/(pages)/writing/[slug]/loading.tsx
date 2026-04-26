import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 mb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          <article className="min-w-0">
            <header className="mb-8 space-y-3">
              <div className="skeleton h-8 w-3/4" />
              <div className="flex items-center gap-2">
                <div className="skeleton h-3 w-28" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <div className="skeleton h-4 w-12 rounded-full" />
                <div className="skeleton h-4 w-16 rounded-full" />
                <div className="skeleton h-4 w-14 rounded-full" />
              </div>
            </header>
            <div className="space-y-3 stagger">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-[97%]" />
              <div className="skeleton h-4 w-[90%]" />
              <div className="skeleton h-4 w-[80%]" />
              <div className="skeleton h-6 w-1/3 mt-6" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-[92%]" />
              <div className="skeleton h-4 w-[75%]" />
              <div className="skeleton h-32 w-full rounded-lg mt-4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-[85%]" />
            </div>
          </article>
          <aside className="hidden lg:block">
            <div className="space-y-2">
              <div className="skeleton h-3 w-20 mb-3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-[80%]" />
              <div className="skeleton h-3 w-[90%]" />
              <div className="skeleton h-3 w-[70%]" />
              <div className="skeleton h-3 w-[85%]" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
