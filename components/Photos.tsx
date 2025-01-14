import NextImage from "next/image";
import Link from "next/link";

interface PhotoProps {
  alt_description: string;
  links: {
    html: string;
    download: string;
  };
  urls: {
    raw: string;
  };
  description: string;
  width: number;
  height: number;
  id: string;
}

function Photo({
  alt_description,
  links,
  urls,
  description,
  width,
  height,
}: PhotoProps) {
  return (
    <figure className="w-full group relative">
      <Link
        href={links.html}
        target="blank"
        className="block overflow-hidden rounded-lg transition-transform duration-700 group-hover:scale-105"
        data-umami-event={description + " -> unsplash"}
      >
        <NextImage
          src={`${urls.raw}&q=90&w=800`}
          alt={alt_description || description}
          width={width}
          height={height}
          className="w-full h-auto"
          quality={100}
        />
      </Link>
    </figure>
  );
}

interface PhotosProps {
  data: PhotoProps[];
}

function Photos({ data }: PhotosProps) {
  return (
    <div className="w-5/6 mx-auto mb-4">
      <div className="grid items-center gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {data.map((item) => (
          <Photo key={item.description} {...item} />
        ))}
      </div>
    </div>
  );
}

export default Photos;
