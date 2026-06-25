import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  TableProperties, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  Database,
  Settings as SettingsIcon,
  Globe
} from 'lucide-react';
import { RecordItem, SheetsStatus, ViewType, SystemSettings } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import PrintPreview from './components/PrintPreview';
import Settings from './components/Settings';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null indicates checking auth
  const [username, setUsername] = useState<string>('');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  
  // Custom Website Branding Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    websiteTitle: 'MCA Register Records System',
    websiteLogoText: 'MCA Register',
    faviconUrl: 'https://img.icons8.com/color/48/data-configuration.png',
    footerText: 'MCA Register Records System'
  });

  // Database / Sheets Data
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus>({
    configured: false,
    spreadsheetId: null,
    clientEmail: null,
  });
  const [sheetsMessage, setSheetsMessage] = useState<string>('Initializing synchronization checks...');
  
  // Printing Selection Cache
  const [printData, setPrintData] = useState<{ title: string; records: RecordItem[] }>({
    title: 'All Records',
    records: [],
  });

  // Navigation Sidebar States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Fetch customizable settings from the backend once on mount
  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && data.websiteTitle) {
            setSettings(data);
          }
        } else {
          // Gracefully load settings from local storage without entering offline mode permanently
          const savedSettings = localStorage.getItem('mca_settings');
          if (savedSettings) {
            try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
          }
        }
      } catch (e) {
        const savedSettings = localStorage.getItem('mca_settings');
        if (savedSettings) {
          try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
        }
      }
    };
    loadSystemSettings();
  }, []);

  // Sync state with HTML Page Title & Favicon links dynamically
  useEffect(() => {
    document.title = settings.websiteTitle;
    if (settings.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings]);


  // Toast Trigger Helper
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check authentication session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('session_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      if (token === 'mock-jwt-token-serverless') {
        sessionStorage.removeItem('session_token');
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUsername(data.username);
          fetchDatabaseRecords(token);
        } else {
          sessionStorage.removeItem('session_token');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth server connection failed:", err);
        showToast("Unable to reach live Netlify server. Operating in offline view mode.", "error");
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch Database Records (and Google Sheets synchronization status)
  const fetchDatabaseRecords = async (token?: string) => {
    const activeToken = token || sessionStorage.getItem('session_token');
    if (!activeToken) return;

    try {
      const res = await fetch('/api/records', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
        setSheetsStatus({
          configured: data.sheetsConnected,
          spreadsheetId: null,
          clientEmail: null,
        });
        setSheetsMessage(data.sheetsStatus || 'Records loaded successfully.');
        
        // Supplement Sheets details (Client Service account details)
        const statusRes = await fetch('/api/sheets-status', {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSheetsStatus({
            configured: statusData.configured,
            spreadsheetId: statusData.spreadsheetId,
            clientEmail: statusData.clientEmail,
          });
        }
      } else {
        showToast(data.error || 'Failed to retrieve records from server.', 'error');
        if (res.status === 401) {
          sessionStorage.removeItem('session_token');
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error("Failed to connect to backend:", err);
      showToast('Could not reach Netlify server. Please check your network connection.', 'error');
    }
  };

  // Handle successful login
  const handleLoginSuccess = (token: string, username: string) => {
    sessionStorage.setItem('session_token', token);
    setUsername(username);
    setIsAuthenticated(true);
    setActiveView('dashboard');
    fetchDatabaseRecords(token);
  };

  // Logout handler
  const handleLogout = async () => {
    const token = sessionStorage.getItem('session_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        // Ignored
      }
    }
    sessionStorage.removeItem('session_token');
    setIsAuthenticated(false);
    setUsername('');
    setRecords([]);
    setActiveView('dashboard');
    showToast('Logged out successfully.', 'success');
  };

  // Record Deleted Callback
  const handleDeleteRecord = async (pin: string) => {
    const token = sessionStorage.getItem('session_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/records/${pin}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Record deleted successfully.', 'success');
        fetchDatabaseRecords(token);
      } else {
        showToast(data.error || 'Failed to delete record.', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting record.', 'error');
    }
  };

  // Handle loading checks
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
        <div className="space-y-4 text-center">
          <svg className="animate-spin h-10 w-10 text-neutral-900 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-neutral-500 text-sm font-semibold tracking-wide uppercase">Initializing MCA Security Layer...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Render login page
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLoginSuccess} showToast={showToast} settings={settings} />
        {/* Toast Containers */}
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // Fully authenticated -> Render Dashboard layout framework
  return (
    <div className="h-screen w-screen bg-neutral-50 flex flex-col md:flex-row overflow-hidden" id="app-viewport">
      {/* Sidebar Navigation - Large Screens */}
      <aside className="no-print hidden md:flex flex-col w-64 h-full bg-neutral-900 text-white shrink-0 border-r border-neutral-800">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-800 gap-3">
          <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white">
            {settings.faviconUrl ? (
              <img src={settings.faviconUrl} alt="Favicon" className="h-5 w-5 object-contain" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <span className="font-bold tracking-tight text-neutral-100 text-sm truncate">{settings.websiteLogoText}</span>
        </div>

        {/* User Info Capsule */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <p className="text-xs text-neutral-500 font-semibold tracking-wider uppercase">Active Operator</p>
          <div className="flex items-center space-x-2 mt-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-neutral-200">{username}</span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === 'dashboard' 
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/50' 
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveView('register'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === 'register' 
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/50' 
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <UserPlus className="h-5 w-5" />
            <span>MCA Register Records</span>
          </button>

          <button
            onClick={() => { setActiveView('records'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === 'records' 
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/50' 
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <TableProperties className="h-5 w-5" />
            <span>MCA Records</span>
          </button>

          <button
            onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === 'settings' 
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/50' 
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            id="sidebar-logout-button"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-neutral-400 hover:bg-neutral-800/60 hover:text-red-400 transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Top Navbar Header - Mobile view */}
      <header className="no-print md:hidden bg-neutral-900 text-white h-16 flex items-center justify-between px-6 shrink-0 border-b border-neutral-800 z-30">
        <div className="flex items-center space-x-2.5">
          {settings.faviconUrl ? (
            <img src={settings.faviconUrl} alt="Favicon" className="h-5 w-5 object-contain" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-neutral-300" />
          )}
          <span className="font-bold tracking-tight text-sm text-neutral-100 truncate">{settings.websiteLogoText}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 top-16 bg-neutral-950/80 backdrop-blur-sm z-40 animate-fade-in">
          <nav className="bg-neutral-900 border-b border-neutral-800 text-white p-6 space-y-3 shadow-2xl">
            <div className="pb-3 border-b border-neutral-800 mb-2">
              <span className="block text-xs text-neutral-500 font-semibold tracking-wider uppercase">Active Operator</span>
              <span className="block text-sm font-semibold text-neutral-200 mt-1">{username}</span>
            </div>

            <button
              onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeView === 'dashboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveView('register'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeView === 'register' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <UserPlus className="h-5 w-5" />
              <span>MCA Register Records</span>
            </button>

            <button
              onClick={() => { setActiveView('records'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeView === 'records' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <TableProperties className="h-5 w-5" />
              <span>MCA Records</span>
            </button>

            <button
              onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeView === 'settings' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <SettingsIcon className="h-5 w-5" />
              <span>Settings</span>
            </button>

            <div className="pt-3 border-t border-neutral-800">
              <button
                onClick={handleLogout}
                id="mobile-logout-button"
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-neutral-800 transition"
              >
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Workspace Container */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:p-10" id="main-content-panel">
        <div className="max-w-6xl mx-auto">
          {activeView === 'dashboard' && (
            <Dashboard 
              records={records} 
              sheetsStatus={sheetsStatus} 
              setView={setActiveView} 
              sheetsMessage={sheetsMessage}
            />
          )}

          {activeView === 'register' && (
            <RecordForm 
              records={records} 
              onRecordSaved={() => fetchDatabaseRecords()} 
              showToast={showToast} 
            />
          )}

          {activeView === 'records' && (
            <RecordsList 
              records={records} 
              onDeleteRecord={handleDeleteRecord} 
              setView={setActiveView} 
              setPrintData={setPrintData}
              showToast={showToast}
            />
          )}

          {activeView === 'settings' && (
            <Settings 
              settings={settings}
              onSettingsSaved={(updated) => setSettings(updated)}
              showToast={showToast}
            />
          )}

          {activeView === 'print' && (
            <PrintPreview 
              printTitle={printData.title} 
              records={printData.records} 
              setView={setActiveView} 
              footerText={settings.footerText}
            />
          )}
        </div>
      </main>

      {/* Toast Alert Notification Containers */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Subcomponent: Toast Container
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-5 right-5 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start space-x-3 p-4 rounded-xl border shadow-lg transition-all pointer-events-auto duration-200 transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="flex-1 text-sm font-semibold">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
