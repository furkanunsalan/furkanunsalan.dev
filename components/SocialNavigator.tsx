export default function SocialNavigator() {
  return (
    <div className="flex space-x-4 mb-8">
      <a
        href="https://github.com/furkanunsalan"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        data-umami-event="Github"
      >
        Github
      </a>
      <span>/</span>
      <a
        href="https://linkedin.com/in/furkanunsalan"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        data-umami-event="Linkedin"
      >
        Linkedin
      </a>
      <span>/</span>
      <a
        href="mailto:hi@furkanunsalan.dev"
        className="hover:underline"
        data-umami-event="Mail"
      >
        Mail
      </a>
      <span>/</span>
      <a
        href="https://read.cv/furkanunsalan"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        data-umami-event="CV"
      >
        CV
      </a>
    </div>
  );
}
