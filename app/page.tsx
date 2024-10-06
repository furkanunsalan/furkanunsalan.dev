import Time from "@/components/Time";
import MainNavbar from "@/components/MainNavbar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Furkan Ünsalan",
  description:
    "Welcome to the personal website of Furkan Ünsalan. Student at Haliç University who loves software development and photography. Explore my portfolio, showcasing projects, professional experiences, and personal insights. Learn more about my journey, skills, and the creative work I've done across various fields. Discover my latest work and connect with me.",
};

const routes = ["/me", "/experience", "/projects", "/photos", "/blog"];

export default function Home() {
  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen px-4">
        <ThemeToggle />
        <div className="flex flex-col items-center">
          <Time location="Europe/Istanbul" shortName="IST" />
          <div className="mt-4 text-3xl">Furkan Ünsalan</div>
        </div>

        {/* Navigation Bar */}
        <MainNavbar routes={routes} />
      </div>
    </>
  );
}
