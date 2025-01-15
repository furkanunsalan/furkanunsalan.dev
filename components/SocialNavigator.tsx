import { Routes } from "@/types";

export default function SocialNavigator({ routes }: { routes: Routes }) {
  return (
    <div className="flex justify-center space-x-4 mb-8">
      {routes.map((route, index) => (
        <>
          <a
            href={route.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-accent-primary"
            data-umami-event={route.name}
          >
            {route.name}
          </a>
          {index < routes.length - 1 && <span>/</span>}
        </>
      ))}
    </div>
  );
}
