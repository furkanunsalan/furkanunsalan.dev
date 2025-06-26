"use client";
import Image from "next/image";

export default function LiteralCurrentlyReading({ books }: { books: any[] }) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {books.map(({ book }) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
