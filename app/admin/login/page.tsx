import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in · admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-xs text-light-fourth">
            Sign in to manage content
          </p>
        </header>
        <LoginForm next={searchParams.next} />
      </div>
    </div>
  );
}
