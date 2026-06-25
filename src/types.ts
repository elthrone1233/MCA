export interface RecordItem {
  pin: string;
  fullName: string;
  dateRegistered: string;
}

export interface SheetsStatus {
  configured: boolean;
  spreadsheetId: string | null;
  clientEmail: string | null;
}

export interface SystemSettings {
  websiteTitle: string;
  websiteLogoText: string;
  faviconUrl: string;
  footerText: string;
}

export type ViewType = 'dashboard' | 'register' | 'records' | 'print' | 'settings';
