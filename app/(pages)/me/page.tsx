import NowPlaying from "@/components/NowPlaying";

export default function Me() {
    return (
        <>
            <div className="flex flex-col items-center text-center p-4 mt-8">
                <h1 className="text-3xl font-bold mb-4">Hi! I&apos;m Furkan 👋</h1>
                <p className="text-lg mb-4">Currently a student @ Haliç who loves software development and photography.</p>
                
                {/* Currently section aligned to the left */}
                <div className="w-full max-w-xl text-left mb-4 mx-auto">
                    <p className="text-xl font-semibold mb-2 text-center">Currently:</p>
                    <ul className="list-none p-0">
                        <li className="mb-2"><strong>📍 Living In:</strong> Istanbul</li>
                        <li className="mb-2"><strong>📖 Reading:</strong> Feel Good Productivity - Ali Abdaal</li>
                        <li className="mb-2"><strong>📐 Working On:</strong> Buildog</li>
                        <li className="mb-2">
                            <strong className="mr-2">Listening:</strong>
                            <div className="text-center mt-2">
                                <NowPlaying />
                            </div>
                        </li>
                        <li className="mb-2"><strong>🍿 Watching:</strong> Silicon Valley </li>
                    </ul>
                </div>

                {/* Contact section centered */}
                <p className="text-lg mb-4 text-center w-full">
                    <strong>Contact:</strong>
                </p>
                <div className="flex space-x-4 mb-4">
                    <a href="https://x.com/furkanunsalan" target="_blank" rel="noopener noreferrer" className="hover:underline">X</a>
                    <span>/</span>
                    <a href="https://github.com/furkanunsalan" target="_blank" rel="noopener noreferrer" className="hover:underline">Github</a>
                    <span>/</span>
                    <a href="https://linkedin.com/in/furkanunsalan" target="_blank" rel="noopener noreferrer" className="hover:underline">Linkedin</a>
                    <span>/</span>
                    <a href="mailto:hi@furkanunsalan.dev" className="hover:underline">Mail</a>
                </div>
                <a href="https://read.cv/furkanunsalan" target="_blank" rel="noopener noreferrer" className="hover:underline">CV ↗</a>
            </div>
        </>
    );
}
