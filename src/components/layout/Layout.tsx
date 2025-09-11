import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Header } from './Header';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/stores/auth';

export function Layout() {
  const { initialize, initialized, user } = useAuth();

  console.log('🏠 Layout render:', { initialized, hasUser: !!user });

  useEffect(() => {
    console.log('🏠 Layout useEffect:', { initialized });
    if (!initialized) {
      console.log('🏠 Calling initialize from Layout...');
      initialize();
    }
  }, [initialize, initialized]);

  if (!initialized) {
    console.log('⏳ Layout: Still initializing auth...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('✅ Layout: Auth initialized, rendering layout');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}