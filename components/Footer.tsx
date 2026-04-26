import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="my-24 py-4 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in delay-300">
      <div className="text-left">
        <span className="block text-light-secondary">Furkan Ünsalan</span>
        <span className="block text-sm text-light-fourth">
          <a
            href="https://www.websitecarbon.com/website/furkanunsalan-dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-accent-primary transition-all duration-200"
          >
            This visit generated 0.07g of CO₂.
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
