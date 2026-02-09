import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { DTRList } from './components/DTRList';
import { RMAList } from './components/RMAList';
import { Analytics } from './components/Analytics';
import { RMAAnalytics } from './components/RMAAnalytics';
import { RMAAgingAnalytics } from './components/RMAAgingAnalytics';
import { MasterData } from './components/MasterData';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { PartsManagement } from './components/PartsManagement';
import { ModelsManagement } from './components/ModelsManagement';
import { TemplateManagement } from './components/TemplateManagement';
import { AuthScreen } from './components/AuthScreen';
import { ThemeToggle } from './components/ThemeToggle';
import { SmartSearchPalette } from './components/SmartSearchPalette';
import { ShortcutHelpDialog } from './components/ShortcutHelpDialog';
import { LiveActivity } from './components/LiveActivity';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { useFieldMode } from './contexts/FieldModeContext';
import { usePermissions } from './hooks/usePermissions';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { LayoutDashboard, FileText, Package, BarChart3, Building2, Users, Wrench, Box, LogOut, TrendingUp, FileStack, Settings } from 'lucide-react';
import { NotificationPreferences } from './components/NotificationPreferences';

type TabId =
  | 'dashboard'
  | 'dtr'
  | 'rma'
  | 'analytics'
  | 'rma-analytics'
  | 'rma-aging'
  | 'masterdata'
  | 'models'
  | 'parts'
  | 'users'
  | 'templates';

export default function App() {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  
  // Get initial tab from URL hash, default to 'dashboard'
  const getInitialTab = (): TabId => {
    const hash = window.location.hash.slice(1); // Remove '#'
    const validTabs: TabId[] = [
      'dashboard',
      'dtr',
      'rma',
      'analytics',
      'rma-analytics',
      'rma-aging',
      'masterdata',
      'models',
      'parts',
      'users',
      'templates',
    ];
    return validTabs.includes(hash as TabId) ? (hash as TabId) : 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [notificationPrefsOpen, setNotificationPrefsOpen] = useState(false);
  const [openCaseFromSearch, setOpenCaseFromSearch] = useState<{ type: 'DTR' | 'RMA'; id: string } | null>(null);
  const { can } = usePermissions(); // Moved here - must be called unconditionally
  const { isFieldMode, setFieldMode } = useFieldMode();

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(true),
    onShowHelp: () => setShortcutHelpOpen(true),
    onClose: () => {
      setSearchOpen(false);
      setShortcutHelpOpen(false);
    },
  });

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
    { id: 'rma-aging', label: 'RMA Aging', icon: TrendingUp, permission: 'analytics:view' as const },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo + app name */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-md ring-2 ring-blue-700/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-800">
                <FileText className="w-6 h-6 sm:w-6 sm:h-6 text-white" aria-hidden />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">Service CRM</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">DTR & RMA</p>
              </div>
            </div>
            {/* Toolbar: search, help, field mode, theme, notifications, settings, user, logout */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <div className="flex items-center rounded-lg bg-gray-100/80 dark:bg-gray-700/50 border border-gray-200/80 dark:border-gray-600/50 p-1">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="p-2 sm:p-2.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Search (Ctrl+K)"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutHelpOpen(true)}
                  className="p-2 sm:p-2.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-mono text-sm font-medium"
                  title="Keyboard shortcuts (?)"
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </button>
                <button
                  type="button"
                  onClick={() => setFieldMode(!isFieldMode)}
                  className={`p-2 sm:p-2.5 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isFieldMode ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white'}`}
                  title={isFieldMode ? 'Exit field mode' : 'Field mode (simplified for mobile)'}
                  aria-label={isFieldMode ? 'Exit field mode' : 'Field mode'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
                <ThemeToggle />
                <Notifications currentUser={currentUser} />
                <button
                  type="button"
                  onClick={() => setNotificationPrefsOpen(true)}
                  className="p-2 sm:p-2.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Notification preferences"
                  aria-label="Notification preferences"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 dark:border-gray-600">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
              <div className="sm:hidden flex items-center pl-1">
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as TabId)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-lg
                    ${isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
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
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-lg
                    ${isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
      <main className={`p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-8rem)] ${isFieldMode ? 'field-mode max-w-lg mx-auto' : 'max-w-[1600px] mx-auto'}`}>
        {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {activeTab === 'dtr' && (
          <DTRList
            currentUser={currentUser}
            openCaseId={openCaseFromSearch?.type === 'DTR' ? openCaseFromSearch.id : null}
            onOpenCaseHandled={() => setOpenCaseFromSearch(null)}
          />
        )}
        {activeTab === 'rma' && (
          <RMAList
            currentUser={currentUser}
            openCaseId={openCaseFromSearch?.type === 'RMA' ? openCaseFromSearch.id : null}
            onOpenCaseHandled={() => setOpenCaseFromSearch(null)}
          />
        )}
        {activeTab === 'analytics' && <Analytics currentUser={currentUser} />}
        {activeTab === 'rma-analytics' && <RMAAnalytics currentUser={currentUser} />}
        {activeTab === 'rma-aging' && <RMAAgingAnalytics currentUser={currentUser} />}
        {activeTab === 'masterdata' && <MasterData currentUser={currentUser} />}
        {activeTab === 'models' && <ModelsManagement />}
        {activeTab === 'parts' && <PartsManagement />}
        {activeTab === 'templates' && <TemplateManagement />}
        {activeTab === 'users' && <UserManagement currentUser={currentUser} />}
      </main>

      <SmartSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(type, id) => {
          if (type === 'DTR') {
            setActiveTab('dtr');
            setOpenCaseFromSearch({ type: 'DTR', id });
            setSearchOpen(false);
          } else if (type === 'RMA') {
            setActiveTab('rma');
            setOpenCaseFromSearch({ type: 'RMA', id });
            setSearchOpen(false);
          } else if (type === 'Site') {
            setActiveTab('masterdata');
            setSearchOpen(false);
          }
        }}
      />
      <ShortcutHelpDialog open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
      {notificationPrefsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNotificationPrefsOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => setNotificationPrefsOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm">Close</button>
            </div>
            <NotificationPreferences />
          </div>
        </div>
      )}
      <LiveActivity />
      {isAuthenticated && <PWAInstallButton />}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}