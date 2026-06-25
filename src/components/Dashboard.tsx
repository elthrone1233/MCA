import React from 'react';
import { Database, CalendarRange, Sparkles, CheckCircle, AlertTriangle, ArrowRight, TableProperties, UserPlus } from 'lucide-react';
import { RecordItem, SheetsStatus, ViewType } from '../types';

interface DashboardProps {
  records: RecordItem[];
  sheetsStatus: SheetsStatus;
  setView: (view: ViewType) => void;
  sheetsMessage: string;
}

export default function Dashboard({ records, sheetsStatus, setView, sheetsMessage }: DashboardProps) {
  const totalRecords = records.length;
  
  // Calculate today's date in local server format (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const recordsToday = records.filter(r => r.dateRegistered === todayStr).length;

  return (
    <div className="space-y-8" id="dashboard-view">
      {/* Top Welcome / Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">System Dashboard</h1>
        <p className="text-neutral-500 mt-1">
          Real-time summary of the MCA Register records and database synchronization status.
        </p>
      </div>

      {/* Integration Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150 ${
        sheetsStatus.configured 
          ? 'bg-emerald-50/50 border-emerald-100' 
          : 'bg-amber-50/50 border-amber-100'
      }`}>
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl shrink-0 ${
            sheetsStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {sheetsStatus.configured ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">Database Engine Status</h3>
            <p className="text-sm text-neutral-600 mt-1">
              {sheetsMessage}
            </p>
            {sheetsStatus.spreadsheetId && (
              <p className="text-xs font-mono text-neutral-500 mt-1">
                Active Spreadsheet ID: {sheetsStatus.spreadsheetId}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center">
          {sheetsStatus.configured && sheetsStatus.spreadsheetId ? (
            <a 
              href={`https://docs.google.com/spreadsheets/d/${sheetsStatus.spreadsheetId}`}
              target="_blank" 
              referrerPolicy="no-referrer"
              rel="noopener noreferrer" 
              className="inline-flex items-center space-x-1.5 text-xs font-medium bg-white text-emerald-800 px-3 py-1.5 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition"
            >
              <span>View Spreadsheet</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : (
            <div className="text-xs text-amber-800 font-medium bg-amber-100/50 px-3 py-1.5 border border-amber-200 rounded-xl">
              Local Storage Mode Active
            </div>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Records */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between" id="stat-card-total">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Total Registered Records</p>
            <h3 className="text-4xl font-extrabold text-neutral-900 font-mono">{totalRecords}</h3>
            <p className="text-xs text-neutral-400">Total permanent records retrieved</p>
          </div>
          <div className="h-14 w-14 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-700 border border-neutral-100 shadow-sm">
            <Database className="h-7 w-7" />
          </div>
        </div>

        {/* Total Registered Today */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center justify-between" id="stat-card-today">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Total Records Today</p>
            <h3 className="text-4xl font-extrabold text-neutral-900 font-mono">{recordsToday}</h3>
            <p className="text-xs text-neutral-400">Registered on date: <span className="font-semibold text-neutral-600">{todayStr}</span></p>
          </div>
          <div className="h-14 w-14 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-700 border border-neutral-100 shadow-sm">
            <CalendarRange className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-neutral-900 text-lg">Quick Actions</h3>
          <p className="text-sm text-neutral-500">Jump directly to record forms or tabular listings.</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setView('register')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 font-medium transition text-left text-sm"
            >
              <span className="flex items-center space-x-2.5">
                <UserPlus className="h-4.5 w-4.5 text-neutral-500" />
                <span>MCA Register Records Form</span>
              </span>
              <ArrowRight className="h-4 w-4 text-neutral-400" />
            </button>
            <button
              onClick={() => setView('records')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 font-medium transition text-left text-sm"
            >
              <span className="flex items-center space-x-2.5">
                <TableProperties className="h-4.5 w-4.5 text-neutral-500" />
                <span>MCA Records Database</span>
              </span>
              <ArrowRight className="h-4 w-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Sync Status / Info */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-neutral-900 text-lg flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-neutral-700" />
            <span>Synchronization Instructions</span>
          </h3>
          <div className="text-sm text-neutral-600 space-y-3">
            <p>
              This records management system is engineered with an advanced <strong>Google Sheets synchronization service</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                Each time you <strong>register</strong> a new record with a unique PIN, it is committed to Google Sheets.
              </li>
              <li>
                The system automatically structures the columns: <code className="bg-neutral-50 px-1 py-0.5 rounded border text-xs text-neutral-700 font-mono">PIN</code>, <code className="bg-neutral-50 px-1 py-0.5 rounded border text-xs text-neutral-700 font-mono">Full Name</code>, and <code className="bg-neutral-50 px-1 py-0.5 rounded border text-xs text-neutral-700 font-mono">Date Registered</code>.
              </li>
              <li>
                Ensure you share your target Google Spreadsheet with the Service Account email client if you are active in production mode to bypass OAuth consent frames in nested sandboxed views.
              </li>
            </ul>
            <div className="pt-2">
              <div className="rounded-xl bg-neutral-50 border border-neutral-200/60 p-3.5">
                <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide">Developer Config Details</span>
                <div className="mt-2 text-xs font-mono text-neutral-600 space-y-1">
                  <div>Service Account Email: <span className="text-neutral-800">{sheetsStatus.clientEmail || 'Not Configured'}</span></div>
                  <div>Spreadsheet Connection: <span className={sheetsStatus.configured ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{sheetsStatus.configured ? 'ACTIVE (Google Sheets)' : 'LOCAL FALLBACK'}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
