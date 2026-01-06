import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { DTRList } from './components/DTRList';
import { RMAList } from './components/RMAList';
import { Analytics } from './components/Analytics';
import { RMAAnalytics } from './components/RMAAnalytics';
import { MasterData } from './components/MasterData';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { PartsManagement } from './components/PartsManagement';
import { ModelsManagement } from './components/ModelsManagement';
import { TemplateManagement } from './components/TemplateManagement';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { LayoutDashboard, FileText, Package, BarChart3, Building2, Users, Wrench, Box, LogOut, TrendingUp, FileStack } from 'lucide-react';

type TabId = 'dashboard' | 'dtr' | 'rma' | 'analytics' | 'rma-analytics' | 'masterdata' | 'models' | 'parts' | 'users' | 'templates';

export default function App() {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  
  // Get initial tab from URL hash, default to 'dashboard'
  const getInitialTab = (): TabId => {
    const hash = window.location.hash.slice(1); // Remove '#'
    const validTabs: TabId[] = ['dashboard', 'dtr', 'rma', 'analytics', 'rma-analytics', 'masterdata', 'models', 'parts', 'users', 'templates'];
    return validTabs.includes(hash as TabId) ? (hash as TabId) : 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());
  const { can } = usePermissions(); // Moved here - must be called unconditionally

  // Update URL hash when tab changes (only if different)
  useEffect(() => {
    const currentHash = window.location.hash.slice(1);
    if (currentHash !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Listen for hash changes (back/forward browser buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getInitialTab();
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    window.location.hash = 'dashboard';
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  // Use real user from backend
  const currentUser = user;

  // Role-based navigation items
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'analytics:view' as const },
    { id: 'dtr', label: 'DTR Cases', icon: FileText, permission: 'dtr:view' as const },
    { id: 'rma', label: 'RMA Cases', icon: Package, permission: 'rma:view' as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:view' as const },
    { id: 'rma-analytics', label: 'RMA Analytics', icon: TrendingUp, permission: 'analytics:view' as const },
    { id: 'masterdata', label: 'Master Data', icon: Building2, permission: 'master:view' as const },
    { id: 'models', label: 'Models', icon: Box, permission: 'models:view' as const },
    { id: 'parts', label: 'Parts', icon: Wrench, permission: 'parts:view' as const },
    { id: 'templates', label: 'Templates', icon: FileStack, permission: 'dtr:create' as const },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item => can(item.permission));

  const adminItems = [
    { id: 'users', label: 'Users', icon: Users, permission: 'users:view' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Service CRM</h1>
            </div>
            <div className="flex items-center gap-4">
              <Notifications currentUser={currentUser} />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as TabId)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {adminItems.filter(item => can(item.permission)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as TabId)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {activeTab === 'dtr' && <DTRList currentUser={currentUser} />}
        {activeTab === 'rma' && <RMAList currentUser={currentUser} />}
        {activeTab === 'analytics' && <Analytics currentUser={currentUser} />}
        {activeTab === 'rma-analytics' && <RMAAnalytics currentUser={currentUser} />}
        {activeTab === 'masterdata' && <MasterData currentUser={currentUser} />}
        {activeTab === 'models' && <ModelsManagement />}
        {activeTab === 'parts' && <PartsManagement />}
        {activeTab === 'templates' && <TemplateManagement />}
        {activeTab === 'users' && <UserManagement currentUser={currentUser} />}
      </main>
    </div>
  );
}