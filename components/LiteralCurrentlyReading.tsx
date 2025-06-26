"use client";
import Image from "next/image";

export default function LiteralCurrentlyReading({ books }: { books: any[] }) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {books.map(({ book }) => (
          <div key={book.id} className="flex flex-col items-center">
            <div className="relative w-32 h-48 sm:w-36 sm:h-56 md:w-40 md:h-60 mb-2">
              <Image
                src={book.cover}
                alt="Book cover"
                fill
                className="object-cover rounded shadow-lg"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
