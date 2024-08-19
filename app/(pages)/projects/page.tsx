export default function Projects() {
    return (
        <>
            <div className="flex flex-col items-center justify-center h-screen">
            <div>My Projects</div>
            <picture> 
                <source 
                    media="(prefers-color-scheme: dark)" 
                    srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30&amp;dark=true" 
                /> 
                <source 
                    media="(prefers-color-scheme: light)" 
                    srcSet="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=30"
                /> 
                <img 
                    alt="" 
                    src="https://ssr-contributions-svg.vercel.app/_/furkanunsalan?format=svg&amp;weeks=15" 
                    max-height="30" 
                /> 
            </picture>
            </div>
        </>
    )
}