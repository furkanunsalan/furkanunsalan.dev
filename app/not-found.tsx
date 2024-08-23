"use client";

import MainNavbar from "@/components/MainNavbar";

const routes = ["/me", "/work", "/projects", "/photos", "/blog"];

export default function NotFound() {
  return (
    <>
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center">
          <div className="text-3xl font-thin italic">404</div>
          <div className="text-l mt-4">
            This is not the page you are looking for
          </div>
          <MainNavbar routes={routes} />
        </div>
      </div>
    </>
  );
}
