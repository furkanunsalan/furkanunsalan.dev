import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-3">
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-4 w-3/4" />
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="skeleton h-9 w-32 rounded-lg" />
            <div className="skeleton h-9 w-24 rounded-lg" />
          </div>
        </header>
        <div className="space-y-3 stagger">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-[95%]" />
          <div className="skeleton h-4 w-[80%]" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-[90%]" />
          <div className="skeleton h-32 w-full rounded-lg mt-4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-[88%]" />
          <div className="skeleton h-4 w-[70%]" />
        </div>
      </div>
    </>
  );
}
