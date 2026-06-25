import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Layout, Eye, Globe, ExternalLink } from 'lucide-react';
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
    </div>
  );
}
