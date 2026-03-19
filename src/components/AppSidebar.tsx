import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from './ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Package,
  BarChart3,
  Building2,
  Users,
  Wrench,
  Box,
  LogOut,
} from 'lucide-react';
import { analyticsService } from '../services/analytics.service';
import { cn } from './ui/utils';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: any;
  onLogout: () => void;
}

interface NavigationBadges {
  dtrOpen: number;
  dtrCritical: number;
  rmaOpen: number;
  rmaPending: number;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
}: AppSidebarProps) {
  const [badges, setBadges] = useState<NavigationBadges>({
    dtrOpen: 0,
    dtrCritical: 0,
    rmaOpen: 0,
    rmaPending: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch badge counts
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const response = await analyticsService.getDashboardStats();
        if (response.data) {
          setBadges({
            dtrOpen: response.data.dtr.open || 0,
            dtrCritical: (response.data.dtr as any).critical || 0,
            rmaOpen: response.data.rma.open || 0,
            rmaPending: response.data.rma.rmaRaisedYetToDeliver || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load navigation badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
    // Refresh badges every 30 seconds
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'dtr',
      label: 'DTR Cases',
      icon: FileText,
      badge: badges.dtrOpen > 0 ? badges.dtrOpen : null,
      badgeVariant: badges.dtrCritical > 0 ? 'destructive' : 'default',
    },
    {
      id: 'rma',
      label: 'RMA Cases',
      icon: Package,
      badge: badges.rmaOpen > 0 ? badges.rmaOpen : null,
      badgeVariant: 'default',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
  ];

  const masterDataItems = [
    {
      id: 'masterdata',
      label: 'Sites & Audis',
      icon: Building2,
      badge: null,
    },
    {
      id: 'models',
      label: 'Models',
      icon: Box,
      badge: null,
    },
    {
      id: 'parts',
      label: 'Parts',
      icon: Wrench,
      badge: null,
    },
  ];

  const adminItems = [
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      badge: null,
    },
  ];

  const { state } = useSidebar();
  
  return (
    <Sidebar 
      collapsible="icon" 
      variant="sidebar" 
      side="left"
      className="border-r border-gray-200 bg-white shadow-sm"
      data-collapsed={state === 'collapsed'}
    >
      <SidebarHeader className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex flex-col items-center gap-1 px-2 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className={cn(
            "flex flex-col items-center min-w-0 transition-all duration-200",
            state === 'collapsed' ? 'hidden' : 'flex'
          )}>
            <h2 className="text-[10px] font-bold text-gray-900 truncate text-center leading-tight">
              CRM
            </h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent 
        className="flex-1 overflow-y-auto" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          visibility: 'visible',
          opacity: 1
        }}
      >
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-gray-400 font-semibold text-[9px] uppercase tracking-wide px-1.5 py-0.5 transition-all duration-200",
            state === 'collapsed' ? 'hidden' : 'block'
          )}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id} className="w-full">
                    <SidebarMenuButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Menu item clicked:', item.id);
                        onTabChange(item.id);
                      }}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        'w-full flex flex-col items-center justify-center px-1 py-2 gap-0.5 cursor-pointer',
                        'min-h-[3rem] touch-manipulation',
                        isActive && 'bg-blue-50 text-blue-700 font-semibold',
                        !isActive && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Icon className="w-5 h-5 shrink-0 pointer-events-none" />
                      <span className={cn(
                        "text-[9px] leading-tight text-center truncate w-full transition-all duration-200 pointer-events-none",
                        state === 'collapsed' ? 'hidden' : 'block'
                      )}>{item.label}</span>
                      {item.badge !== null && item.badge > 0 && (
                        <SidebarMenuBadge
                          className={cn(
                            'absolute top-1 right-1 text-[8px] px-1 py-0 min-w-[1rem] h-4 flex items-center justify-center pointer-events-none',
                            item.badgeVariant === 'destructive'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                          )}
                        >
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Master Data */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-gray-400 font-semibold text-[9px] uppercase tracking-wide px-1.5 py-0.5 transition-all duration-200",
            state === 'collapsed' ? 'hidden' : 'block'
          )}>
            Data
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterDataItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id} className="w-full">
                    <SidebarMenuButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Menu item clicked:', item.id);
                        onTabChange(item.id);
                      }}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        'w-full flex flex-col items-center justify-center px-1 py-2 gap-0.5 cursor-pointer',
                        'min-h-[3rem] touch-manipulation',
                        isActive && 'bg-blue-50 text-blue-700 font-semibold',
                        !isActive && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Icon className="w-5 h-5 shrink-0 pointer-events-none" />
                      <span className={cn(
                        "text-[9px] leading-tight text-center truncate w-full transition-all duration-200 pointer-events-none",
                        state === 'collapsed' ? 'hidden' : 'block'
                      )}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Administration */}
        {currentUser?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className={cn(
              "text-gray-400 font-semibold text-[9px] uppercase tracking-wide px-1.5 py-0.5 transition-all duration-200",
              state === 'collapsed' ? 'hidden' : 'block'
            )}>
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id} className="w-full">
                    <SidebarMenuButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Menu item clicked:', item.id);
                        onTabChange(item.id);
                      }}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        'w-full flex flex-col items-center justify-center px-1 py-2 gap-0.5 cursor-pointer',
                        'min-h-[3rem] touch-manipulation',
                        isActive && 'bg-blue-50 text-blue-700 font-semibold',
                        !isActive && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Icon className="w-5 h-5 shrink-0 pointer-events-none" />
                      <span className={cn(
                        "text-[9px] leading-tight text-center truncate w-full transition-all duration-200 pointer-events-none",
                        state === 'collapsed' ? 'hidden' : 'block'
                      )}>{item.label}</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 bg-white flex-shrink-0 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem className="w-full">
            <SidebarMenuButton 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLogout();
              }}
              tooltip="Logout"
              className="w-full flex flex-col items-center justify-center px-1 py-2 gap-0.5 text-gray-600 hover:bg-red-50 hover:text-red-700 cursor-pointer min-h-[3rem] touch-manipulation"
              style={{ pointerEvents: 'auto' }}
            >
              <LogOut className="w-5 h-5 shrink-0 pointer-events-none" />
              <span className={cn(
                "text-[9px] leading-tight text-center truncate w-full transition-all duration-200 pointer-events-none",
                state === 'collapsed' ? 'hidden' : 'block'
              )}>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
