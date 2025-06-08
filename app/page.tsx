import Time from "@/components/Time";
import MainNavbar from "@/components/MainNavbar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const routes = ["/me", "/experience", "/projects", "/photos", "/bookmarks", "/writing"];

export default function Home() {
  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen px-4" >
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
