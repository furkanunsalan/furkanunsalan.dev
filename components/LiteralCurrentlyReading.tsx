"use client";
import Image from "next/image";

export default function LiteralCurrentlyReading({ books }: { books: any[] }) {
  const calculateProgress = (progress: any) => {
    if (!progress) return 0;
    if (progress.unit === "PERCENTAGE") {
      return progress.progress;
    }
    if (progress.capacity && progress.progress) {
      return (progress.progress / progress.capacity) * 100;
    }
    return 0;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {books.map(({ book, progress }) => {
          const progressPercentage = calculateProgress(progress);
          return (
            <div key={book.id} className="flex flex-col items-center">
              <div className="relative w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-48 lg:w-36 lg:h-56 xl:w-40 xl:h-60 mb-2">
                <Image
                  src={book.cover}
                  alt="Book cover"
                  fill
                  className="object-cover rounded shadow-lg"
                  sizes="33vw"
                  priority
                />
              </div>
              {progress && (
                <div className="w-full max-w-24 sm:max-w-28 md:max-w-32 lg:max-w-36 xl:max-w-40">
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary transition-all duration-300 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
