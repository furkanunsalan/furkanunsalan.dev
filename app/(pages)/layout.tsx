import BreadcrumbNavigator from "@/components/BreadcrumpNavigator";
import Footer from "@/components/Footer";
import React, { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <BreadcrumbNavigator />
      {children}
      <Footer />
    </>
  );
};

export default Layout;
