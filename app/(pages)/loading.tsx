import TopProgressBar from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 stagger">
        <div className="flex items-start justify-between mb-3">
          <div className="skeleton h-6 w-48" />
          <div className="flex flex-col items-end gap-1">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-circle h-4 w-4" />
          ))}
        </div>
        <div className="space-y-2 mb-10">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-[95%]" />
          <div className="skeleton h-4 w-[88%]" />
          <div className="skeleton h-4 w-[60%]" />
        </div>
        <div className="skeleton h-3 w-16 mb-3" />
        <ul className="border-t border-white/[0.06]">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="py-2.5 border-b border-white/[0.06] flex items-center gap-3"
            >
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-10" />
              <div className="skeleton h-4 flex-1" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
