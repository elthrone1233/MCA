import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Layout, Eye, Globe, ExternalLink, Users, UserPlus, Lock, ShieldCheck } from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsProps {
  settings: SystemSettings;
  onSettingsSaved: (updated: SystemSettings) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function Settings({ settings, onSettingsSaved, showToast }: SettingsProps) {
  const [websiteTitle, setWebsiteTitle] = useState(settings.websiteTitle);
  const [websiteLogoText, setWebsiteLogoText] = useState(settings.websiteLogoText);
  const [faviconUrl, setFaviconUrl] = useState(settings.faviconUrl);
  const [footerText, setFooterText] = useState(settings.footerText);
  const [isSaving, setIsSaving] = useState(false);

  // Additional Admin Credentials States
  const [adminsList, setAdminsList] = useState<{ username: string }[]>([]);
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    const token = sessionStorage.getItem('session_token');
    
    if (token === 'mock-jwt-token-serverless') {
      const stored = localStorage.getItem('mca_admins');
      let parsed = [];
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (e) {}
      } else {
        parsed = [{ username: 'admin' }];
        localStorage.setItem('mca_admins', JSON.stringify(parsed));
      }
      setAdminsList(parsed.map((a: any) => ({ username: a.username })));
      setIsLoadingAdmins(false);
      return;
    }

    try {
      const res = await fetch('/api/admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      } else {
        const stored = localStorage.getItem('mca_admins');
        if (stored) {
          try { setAdminsList(JSON.parse(stored).map((a: any) => ({ username: a.username }))); } catch (e) {}
        } else {
          setAdminsList([{ username: 'admin' }]);
        }
      }
    } catch (e) {
      const stored = localStorage.getItem('mca_admins');
      if (stored) {
        try { setAdminsList(JSON.parse(stored).map((a: any) => ({ username: a.username }))); } catch (e) {}
      } else {
        setAdminsList([{ username: 'admin' }]);
      }
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim()) {
      showToast('Username cannot be empty.', 'error');
      return;
    }
    if (!newAdminPass.trim()) {
      showToast('Password cannot be empty.', 'error');
      return;
    }

    setIsAddingAdmin(true);
    const token = sessionStorage.getItem('session_token');

    if (token === 'mock-jwt-token-serverless') {
      const stored = localStorage.getItem('mca_admins');
      let parsed = [];
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (e) {}
      } else {
        parsed = [{ username: 'admin', password: 'password123' }];
      }

      const duplicate = parsed.some((a: any) => a.username.toLowerCase() === newAdminUser.trim().toLowerCase());
      if (duplicate || newAdminUser.trim().toLowerCase() === 'admin') {
        showToast('Username already exists.', 'error');
        setIsAddingAdmin(false);
        return;
      }

      parsed.push({ username: newAdminUser.trim(), password: newAdminPass.trim() });
      localStorage.setItem('mca_admins', JSON.stringify(parsed));
      showToast('Admin account registered in browser storage!', 'success');
      setNewAdminUser('');
      setNewAdminPass('');
      setIsAddingAdmin(false);
      fetchAdmins();
      return;
    }

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newAdminUser.trim(), password: newAdminPass.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Admin account added successfully!', 'success');
        setNewAdminUser('');
        setNewAdminPass('');
        fetchAdmins();
      } else {
        showToast(data.error || 'Failed to add admin account.', 'error');
      }
    } catch (err: any) {
      // Offline fallback saving
      const stored = localStorage.getItem('mca_admins');
      let parsed = [];
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (e) {}
      } else {
        parsed = [{ username: 'admin', password: 'password123' }];
      }

      const duplicate = parsed.some((a: any) => a.username.toLowerCase() === newAdminUser.trim().toLowerCase());
      if (duplicate || newAdminUser.trim().toLowerCase() === 'admin') {
        showToast('Username already exists.', 'error');
        setIsAddingAdmin(false);
        return;
      }

      parsed.push({ username: newAdminUser.trim(), password: newAdminPass.trim() });
      localStorage.setItem('mca_admins', JSON.stringify(parsed));
      showToast('Admin account saved to browser storage!', 'success');
      setNewAdminUser('');
      setNewAdminPass('');
      fetchAdmins();
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!websiteTitle.trim()) {
      showToast('Website Title cannot be empty.', 'error');
      return;
    }
    if (!websiteLogoText.trim()) {
      showToast('Website Logo Text cannot be empty.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const token = sessionStorage.getItem('session_token');
      let res;
      try {
        res = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            websiteTitle: websiteTitle.trim(),
            websiteLogoText: websiteLogoText.trim(),
            faviconUrl: faviconUrl.trim(),
            footerText: footerText.trim(),
          }),
        });
      } catch (netErr) {
        // Fallback to localStorage save directly on static deployment
        const updated = {
          websiteTitle: websiteTitle.trim(),
          websiteLogoText: websiteLogoText.trim(),
          faviconUrl: faviconUrl.trim(),
          footerText: footerText.trim(),
        };
        localStorage.setItem('mca_settings', JSON.stringify(updated));
        showToast('Settings saved to local storage (Static Fallback Mode).', 'success');
        onSettingsSaved(updated);
        return;
      }

      if (res && res.status === 404) {
        const updated = {
          websiteTitle: websiteTitle.trim(),
          websiteLogoText: websiteLogoText.trim(),
          faviconUrl: faviconUrl.trim(),
          footerText: footerText.trim(),
        };
        localStorage.setItem('mca_settings', JSON.stringify(updated));
        showToast('Settings saved to local storage (Static Fallback Mode).', 'success');
        onSettingsSaved(updated);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      showToast('Settings updated and persisted successfully!', 'success');
      onSettingsSaved(data.settings);
    } catch (err: any) {
      showToast(err.message || 'Error occurred saving settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setWebsiteTitle('MCA Register Records System');
    setWebsiteLogoText('MCA Register');
    setFaviconUrl('https://img.icons8.com/color/48/data-configuration.png');
    setFooterText('MCA Register Records System');
    showToast('Reset inputs to defaults (unsaved). Click Save to commit.', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" id="settings-view">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-neutral-800" />
          <span>System Settings</span>
        </h1>
        <p className="text-neutral-500 mt-1">
          Customize and adapt app branding, tab headings, logos, icons, and text permanently.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="bg-neutral-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-2.5">
              <Layout className="h-5 w-5" />
              <h2 className="font-semibold text-sm uppercase tracking-wider">Branding Configurator</h2>
            </div>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-xs bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 px-2.5 py-1.5 rounded-lg border border-neutral-700 transition"
            >
              Reset to Defaults
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Website Title Field */}
            <div>
              <label htmlFor="settings-website-title" className="block text-sm font-semibold text-neutral-700">
                Website / Tab Title <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">Appears as the HTML page header in the browser window/tab.</p>
              <input
                type="text"
                id="settings-website-title"
                value={websiteTitle}
                onChange={(e) => setWebsiteTitle(e.target.value)}
                className="mt-2 block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm"
                placeholder="MCA Register Records System"
              />
            </div>

            {/* Logo / Brand Text Field */}
            <div>
              <label htmlFor="settings-website-logo" className="block text-sm font-semibold text-neutral-700">
                Sidebar Logo / Brand Text <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">Branding text rendered in sidebar navigation headers.</p>
              <input
                type="text"
                id="settings-website-logo"
                value={websiteLogoText}
                onChange={(e) => setWebsiteLogoText(e.target.value)}
                className="mt-2 block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm"
                placeholder="MCA Register"
              />
            </div>

            {/* Favicon URL Field */}
            <div>
              <label htmlFor="settings-favicon-url" className="block text-sm font-semibold text-neutral-700">
                Favicon Image URL
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">Absolute web URL linking to an image icon (.png, .ico, or .svg).</p>
              <input
                type="url"
                id="settings-favicon-url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                className="mt-2 block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm font-mono"
                placeholder="https://img.icons8.com/color/48/data-configuration.png"
              />
            </div>

            {/* Footer Text Field */}
            <div>
              <label htmlFor="settings-footer-text" className="block text-sm font-semibold text-neutral-700">
                System Footer Text
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">Branding text printed at the bottom of sheets and reports.</p>
              <input
                type="text"
                id="settings-footer-text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="mt-2 block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm"
                placeholder="MCA Register Records System"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-neutral-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition duration-150 inline-flex items-center justify-center space-x-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 text-white" />
                    <span>Saving configurations...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Pane */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 text-white space-y-6">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Real-time Preview</span>
          </h3>

          {/* Browser Tab preview simulation */}
          <div className="space-y-2">
            <span className="block text-xs text-neutral-400 font-medium">Simulated Browser Tab</span>
            <div className="bg-neutral-850 border border-neutral-800 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-neutral-300 overflow-hidden">
              <div className="shrink-0 bg-neutral-800 p-1.5 rounded-md">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="h-4.5 w-4.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Globe className="h-4.5 w-4.5" />
                )}
              </div>
              <span className="font-semibold truncate">{websiteTitle || 'MCA Register Records System'}</span>
            </div>
          </div>

          {/* Sidebar preview simulation */}
          <div className="space-y-2">
            <span className="block text-xs text-neutral-400 font-medium">Simulated Navigation Header</span>
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex items-center space-x-2.5 text-xs">
              <div className="shrink-0 bg-neutral-800 p-1.5 rounded-lg border border-neutral-700">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="h-4.5 w-4.5 object-contain" />
                ) : (
                  <Globe className="h-4.5 w-4.5" />
                )}
              </div>
              <span className="font-bold tracking-tight text-neutral-100 text-sm truncate">
                {websiteLogoText || 'MCA Register'}
              </span>
            </div>
          </div>

          {/* Footer Preview simulation */}
          <div className="space-y-2">
            <span className="block text-xs text-neutral-400 font-medium">Print/Footer Legend</span>
            <div className="bg-neutral-850 border border-neutral-800 rounded-xl p-3 text-center text-[10px] text-neutral-400 font-mono">
              {footerText || 'MCA Register Records System'}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500 space-y-2">
            <p className="leading-relaxed">
              When settings are saved, the browser’s actual &lt;title&gt; page title and favicon tags will be dynamically hotloaded in the DOM instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Administrative Credentials Management section */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden" id="admin-management-panel">
        <div className="bg-neutral-900 px-6 py-4 flex items-center space-x-2.5 text-white">
          <ShieldCheck className="h-5 w-5 text-neutral-300" />
          <h2 className="font-semibold text-sm uppercase tracking-wider">Administrative Credentials</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add Admin Form */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-neutral-600" />
                <span>Register Additional Admin</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Create supplementary login credentials with full system access.</p>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label htmlFor="new-admin-user" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Admin Username
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">@</span>
                  <input
                    type="text"
                    id="new-admin-user"
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm"
                    placeholder="secondary_admin"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-admin-pass" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="password"
                    id="new-admin-pass"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAddingAdmin}
                  className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition duration-150 inline-flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isAddingAdmin ? (
                    <>
                      <RefreshCw className="animate-spin h-3 w-3 text-white" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add Administrator</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Current Admins List */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-neutral-800 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-600" />
                <span>Authorized Accounts</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">List of active admin usernames authorized to modify system records.</p>
            </div>

            {isLoadingAdmins ? (
              <div className="flex items-center justify-center h-32 text-xs text-neutral-400">
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                <span>Loading admin accounts...</span>
              </div>
            ) : (
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-xs">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-semibold text-neutral-600 uppercase tracking-wider">
                        Username
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold text-neutral-600 uppercase tracking-wider">
                        Scope
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-150">
                    {/* Primary env admin (always exists) */}
                    <tr>
                      <td className="px-4 py-2 font-medium text-neutral-800 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        <span>admin</span>
                        <span className="text-[10px] text-neutral-400 font-normal font-mono">(primary)</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-500 font-semibold border border-neutral-200">
                          Superuser
                        </span>
                      </td>
                    </tr>
                    {adminsList
                      .filter(a => a.username !== 'admin')
                      .map((admin, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-medium text-neutral-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-neutral-400"></span>
                            <span>{admin.username}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-500 font-semibold border border-neutral-200">
                              Admin
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
