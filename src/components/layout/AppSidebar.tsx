import { Target, Settings, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUserRole } from '@/hooks/useUserRole';

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { userRole } = useUserRole();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  // Filter navigation based on user role
  const getVisibleNavigation = () => {
    // Base navigation for all users
    const baseNavigation = [
      { name: 'Bandi', href: '/bandi', icon: Target },
      { name: 'Profile', href: '/profile', icon: User },
    ];

    // Add Settings only if user has permission (admin or can access settings)
    if (userRole === 'admin' || userRole === 'user') {
      baseNavigation.push({ name: 'Settings', href: '/settings', icon: Settings });
    }

    return baseNavigation;
  };

  return (
    <Sidebar className={isCollapsed ? 'w-16' : 'w-64'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getVisibleNavigation().map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}