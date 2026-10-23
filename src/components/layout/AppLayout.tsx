/**
 * App Layout Component
 * Main layout wrapper with responsive navigation
 */

import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { ToastContainer } from '@/components/common';
import { UserChatWidget } from '@/components/features/messages/UserChatWidget';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell flex min-h-screen min-w-0 bg-neutral-50">
      <SideNav />
      <main className="app-main flex min-w-0 flex-1 flex-col">
        {children || <Outlet />}
      </main>
      <BottomNav />
      <ToastContainer />
      {/* Chat widget — visible on every user page */}
      <UserChatWidget />
    </div>
  );
}
