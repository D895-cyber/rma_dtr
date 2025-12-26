import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { DTRList } from './components/DTRList';
import { RMAList } from './components/RMAList';
import { Analytics } from './components/Analytics';
import { MasterData } from './components/MasterData';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { PartsManagement } from './components/PartsManagement';
import { ModelsManagement } from './components/ModelsManagement';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';
import { LayoutDashboard, FileText, Package, BarChart3, Building2, Users, Wrench, Box, LogOut } from 'lucide-react';

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dtr' | 'rma' | 'analytics' | 'masterdata' | 'models' | 'parts' | 'users'>('dashboard');

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dtr', label: 'DTR Cases', icon: FileText },
    { id: 'rma', label: 'RMA Cases', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'masterdata', label: 'Master Data', icon: Building2 },
    { id: 'models', label: 'Models', icon: Box },
    { id: 'parts', label: 'Parts', icon: Wrench },
  ];

  const adminItems = [
    { id: 'users', label: 'Users', icon: Users },
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
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
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
                  onClick={() => setActiveTab(item.id as any)}
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
            {currentUser?.role === 'admin' && adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
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
        {activeTab === 'masterdata' && <MasterData currentUser={currentUser} />}
        {activeTab === 'models' && <ModelsManagement />}
        {activeTab === 'parts' && <PartsManagement />}
        {activeTab === 'users' && <UserManagement currentUser={currentUser} />}
      </main>
    </div>
  );
}