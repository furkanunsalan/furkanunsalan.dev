import BreadcrumbNavigator from '@/components/BreadcrumpNavigator';
import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
        <BreadcrumbNavigator />
        {children}
    </>
  );
};

export default Layout;
