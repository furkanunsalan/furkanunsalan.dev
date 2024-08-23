import GithubCommitHistory from "@/components/GithubCommitHistory";

export default function Projects() {
    return (
        <>
            <div className="flex flex-col items-center justify-center h-screen">
            <div>My Projects</div>
            <GithubCommitHistory />
            </div>
        </>
    )
}