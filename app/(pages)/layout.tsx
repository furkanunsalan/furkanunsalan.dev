import SiteNav from "@/components/SiteNav";
import React, { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <SiteNav />
      {children}
    </>
  );
};

export default Layout;
