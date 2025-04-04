import React from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const Footer: React.FC = () => {
  return (
    <footer className="my-24 py-4 w-5/6 xl:w-1/3 mx-auto">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          {/* Name and carbon emission text */}
          <div>
            <span className="block text-dark-secondary dark:text-light-secondary">
              Furkan Ünsalan
            </span>
            <span className="block text-sm text-light-fourth dark:text-light-secondary">
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
        </div>

        {/* ThemeToggle component */}
        <div className="flex space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
