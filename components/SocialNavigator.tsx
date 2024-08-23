export default function SocialNavigator() {
    return (
        <div className="flex space-x-4 mb-8">
          <a
            href="https://x.com/furkanunsalan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            X
          </a>
          <span>/</span>
          <a
            href="https://github.com/furkanunsalan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Github
          </a>
          <span>/</span>
          <a
            href="https://linkedin.com/in/furkanunsalan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Linkedin
          </a>
          <span>/</span>
          <a href="mailto:hi@furkanunsalan.dev" className="hover:underline">
            Mail
          </a>
          <span>/</span>
          <a
            href="https://read.cv/furkanunsalan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            CV
          </a>
        </div>
    )
}