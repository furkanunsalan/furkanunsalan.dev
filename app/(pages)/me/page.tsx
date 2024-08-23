import NowPlaying from "@/components/NowPlaying";
import SocialNavigator from "@/components/SocialNavigator";
import ToolTabs from "@/components/ToolTabs"
import { tools } from "@/lib/my-tools";

export default function Me() {
  return (
    <>
      <div className="flex flex-col items-center text-center p-4 mt-8">
        <h1 className="text-3xl font-bold mb-4">Hi! I&apos;m Furkan 👋</h1>
        <p className="text-lg mb-4">
          Student @ Haliç who loves software development and
          photography.
        </p>

        <SocialNavigator />

        <div className="w-full max-w-xl text-left mb-4 mx-auto">
          <p className="text-xl font-semibold mb-2 text-center">Currently:</p>
          <ul className="list-none p-0">
            <li className="mb-2">
              <strong>📍 Living In:</strong> Istanbul
            </li>
            <li className="mb-2">
              <strong>📖 Reading:</strong> Feel Good Productivity - Ali Abdaal
            </li>
            <li className="mb-2">
              <strong>📐 Working On:</strong> Buildog
            </li>
            <li className="mb-2">
              <strong className="mr-2">🎧 Listening:</strong>
              <div className="text-center mt-2">
                <NowPlaying />
              </div>
            </li>
            <li className="mb-2">
              <strong>🍿 Watching:</strong> Silicon Valley{" "}
            </li>
          </ul>
        </div>
      </div>

      <ToolTabs tools={tools} />
    </>
  );
}
