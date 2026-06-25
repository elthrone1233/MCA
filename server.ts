import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- SESSION STORAGE (In-memory token system for iframe-safe session preservation) ---
const sessions = new Map<string, { username: string; createdAt: Date }>();

// --- DATABASE PERSISTENCE (Google Sheets with Local JSON Fallback) ---
const localDbPath = path.join(process.cwd(), 'src', 'records_db.json');

// Interface for record
interface RecordItem {
  pin: string;
  fullName: string;
  dateRegistered: string;
}

// Read local JSON file database
function readLocalDb(): RecordItem[] {
  try {
    if (fs.existsSync(localDbPath)) {
      const data = fs.readFileSync(localDbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading local JSON db:', error);
  }
  return [];
}

// Write to local JSON file database
function writeLocalDb(data: RecordItem[]) {
  try {
    const dir = path.dirname(localDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing local JSON db:', error);
  }
}

// --- SETTINGS PERSISTENCE ---
const settingsPath = path.join(process.cwd(), 'src', 'settings_db.json');

interface SystemSettings {
  websiteTitle: string;
  websiteLogoText: string;
  faviconUrl: string;
  footerText: string;
}

function readSettings(): SystemSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings JSON db:', error);
  }
  return {
    websiteTitle: "MCA Register Records System",
    websiteLogoText: "MCA Register",
    faviconUrl: "https://img.icons8.com/color/48/data-configuration.png",
    footerText: "MCA Register Records System"
  };
}

function writeSettings(data: SystemSettings) {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing settings JSON db:', error);
  }
}


// Check Google Sheets API settings and status
function getSheetsConfig() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  return {
    isConfigured: !!(email && privateKey && spreadsheetId),
    email,
    privateKey,
    spreadsheetId,
  };
}

// Initialize Google Sheets JWT authentication client
function getSheetsClient() {
  const { isConfigured, email, privateKey, spreadsheetId } = getSheetsConfig();
  if (!isConfigured) {
    throw new Error('Google Sheets credentials are not fully configured in environment variables.');
  }

  // Format key to resolve newline issues
  const formattedKey = privateKey!.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Ensure the Spreadsheet has headers
async function ensureHeadersExist(sheets: any, spreadsheetId: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:C1',
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:C1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['PIN', 'Full Name', 'Date Registered']],
        },
      });
      console.log('Successfully initialized headers in Google Sheet');
    }
  } catch (err: any) {
    console.error('Error checking/writing headers in Google Sheets:', err.message);
  }
}

// Fetch all records with full integration status
async function loadAllRecords(): Promise<{
  records: RecordItem[];
  sheetsConnected: boolean;
  sheetsStatus: string;
}> {
  const config = getSheetsConfig();
  const localRecords = readLocalDb();

  if (!config.isConfigured) {
    return {
      records: localRecords,
      sheetsConnected: false,
      sheetsStatus: 'Google Sheets variables are not set in the environment. Active in local fallback mode.',
    };
  }

  try {
    const sheets = getSheetsClient();
    await ensureHeadersExist(sheets, config.spreadsheetId!);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId!,
      range: 'Sheet1!A:C',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      // If sheets has no records, sync our local fallback records to Google Sheets!
      if (localRecords.length > 0) {
        const values = localRecords.map(r => [r.pin, r.fullName, r.dateRegistered]);
        await sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId!,
          range: `Sheet1!A2:C${1 + localRecords.length}`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
        console.log(`Synced ${localRecords.length} local fallback records to Google Sheets.`);
      }
      return {
        records: localRecords,
        sheetsConnected: true,
        sheetsStatus: 'Connected to Google Sheets. Synced initial records successfully.',
      };
    }

    // Google Sheets is the source of truth
    const recordsFromSheets: RecordItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]) {
        recordsFromSheets.push({
          pin: row[0],
          fullName: row[1] || '',
          dateRegistered: row[2] || '',
        });
      }
    }

    // Always keep local DB synced with Google Sheets just in case of offline/credential changes later
    writeLocalDb(recordsFromSheets);

    return {
      records: recordsFromSheets,
      sheetsConnected: true,
      sheetsStatus: 'Successfully synchronized in real-time with Google Sheets.',
    };
  } catch (err: any) {
    console.error('Google Sheets fetch failed, falling back to local database:', err.message);
    return {
      records: localRecords,
      sheetsConnected: false,
      sheetsStatus: `Failed to connect to Google Sheets: ${err.message}. Showing local database.`,
    };
  }
}

// Save a single record
async function addRecord(newRecord: RecordItem): Promise<{
  success: boolean;
  sheetsConnected: boolean;
  error?: string;
}> {
  // Validate PIN pattern: exactly 12 numeric digits
  if (!/^\d{12}$/.test(newRecord.pin)) {
    return { success: false, sheetsConnected: false, error: 'PIN must be exactly 12 numeric digits.' };
  }

  // Read records to verify unique PIN
  const current = readLocalDb();
  if (current.some(r => r.pin === newRecord.pin)) {
    return { success: false, sheetsConnected: false, error: 'Duplicate PIN error. This PIN is already registered.' };
  }

  // Update local DB first
  const updated = [...current, newRecord];
  writeLocalDb(updated);

  const config = getSheetsConfig();
  if (!config.isConfigured) {
    return {
      success: true,
      sheetsConnected: false,
    };
  }

  try {
    const sheets = getSheetsClient();
    await ensureHeadersExist(sheets, config.spreadsheetId!);
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId!,
      range: 'Sheet1!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newRecord.pin, newRecord.fullName, newRecord.dateRegistered]],
      },
    });
    return {
      success: true,
      sheetsConnected: true,
    };
  } catch (err: any) {
    console.error('Failed to write record to Google Sheets:', err.message);
    // Even if Sheets write fails, the local DB has saved it, but we return success with connection failure flag
    return {
      success: true,
      sheetsConnected: false,
      error: `Record saved locally, but failed to upload to Google Sheets: ${err.message}`,
    };
  }
}

// Delete a single record by PIN
async function deleteRecord(pin: string): Promise<{
  success: boolean;
  sheetsConnected: boolean;
  error?: string;
}> {
  const current = readLocalDb();
  const updated = current.filter(r => r.pin !== pin);
  
  if (current.length === updated.length) {
    return { success: false, sheetsConnected: false, error: 'Record with specified PIN not found.' };
  }

  // Write updated data locally
  writeLocalDb(updated);

  const config = getSheetsConfig();
  if (!config.isConfigured) {
    return {
      success: true,
      sheetsConnected: false,
    };
  }

  try {
    const sheets = getSheetsClient();
    // Re-write sheets data
    await sheets.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheetId!,
      range: 'Sheet1!A2:C1000',
    });

    if (updated.length > 0) {
      const values = updated.map(r => [r.pin, r.fullName, r.dateRegistered]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId!,
        range: `Sheet1!A2:C${1 + updated.length}`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
    }

    return {
      success: true,
      sheetsConnected: true,
    };
  } catch (err: any) {
    console.error('Failed to sync deletion with Google Sheets:', err.message);
    return {
      success: true,
      sheetsConnected: false,
      error: `Record deleted locally, but Google Sheets sync failed: ${err.message}`,
    };
  }
}

// --- EXPRESS MIDDLEWARES ---
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Authorization header is missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  next();
}

// --- API ENDPOINTS ---

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'password123';

  if (username === expectedUsername && password === expectedPassword) {
    const token = crypto.randomUUID();
    sessions.set(token, {
      username,
      createdAt: new Date(),
    });
    return res.json({ token, username });
  }

  return res.status(400).json({ error: 'Invalid username or password.' });
});

// Admin Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    sessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Verify Current Token / Auth Session
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, username: session.username });
});

// Get Database / Integration Status
app.get('/api/sheets-status', requireAuth, (req, res) => {
  const config = getSheetsConfig();
  res.json({
    configured: config.isConfigured,
    spreadsheetId: config.spreadsheetId || null,
    clientEmail: config.email || null,
  });
});

// Fetch All Records (Reads from Google Sheets if active, falls back dynamically)
app.get('/api/records', requireAuth, async (req, res) => {
  try {
    const { records, sheetsConnected, sheetsStatus } = await loadAllRecords();
    res.json({ records, sheetsConnected, sheetsStatus });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve records', details: error.message });
  }
});

// Add a Record (Checks for duplicates, saves to Sheets + local fallback)
app.post('/api/records', requireAuth, async (req, res) => {
  const { pin, fullName } = req.body;

  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'PIN is required and cannot be empty.' });
  }
  if (!/^\d{12}$/.test(pin.trim())) {
    return res.status(400).json({ error: 'PIN must be exactly 12 numeric digits (minimum 12 and maximum 12 digits).' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full Name is required and cannot be empty.' });
  }

  try {
    const dateRegistered = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const result = await addRecord({
      pin: pin.trim(),
      fullName: fullName.trim(),
      dateRegistered,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: result.error || 'Record saved successfully.',
      sheetsConnected: result.sheetsConnected,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save record', details: error.message });
  }
});

// Delete a Record
app.delete('/api/records/:pin', requireAuth, async (req, res) => {
  const { pin } = req.params;

  try {
    const result = await deleteRecord(pin);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: result.error || 'Record deleted successfully.',
      sheetsConnected: result.sheetsConnected,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete record', details: error.message });
  }
});

// Fetch system settings (no auth required so the login page can load favicon/brand custom settings)
app.get('/api/settings', (req, res) => {
  const currentSettings = readSettings();
  res.json(currentSettings);
});

// Save system settings
app.post('/api/settings', requireAuth, (req, res) => {
  const { websiteTitle, websiteLogoText, faviconUrl, footerText } = req.body;
  
  if (!websiteTitle || !websiteTitle.trim()) {
    return res.status(400).json({ error: 'Website Title cannot be empty.' });
  }
  if (!websiteLogoText || !websiteLogoText.trim()) {
    return res.status(400).json({ error: 'Website Logo/Brand Text cannot be empty.' });
  }
  
  const updatedSettings: SystemSettings = {
    websiteTitle: websiteTitle.trim(),
    websiteLogoText: websiteLogoText.trim(),
    faviconUrl: (faviconUrl || '').trim(),
    footerText: (footerText || '').trim(),
  };
  
  writeSettings(updatedSettings);
  res.json({ success: true, message: 'System configurations saved successfully.', settings: updatedSettings });
});


// --- VITE DEV OR STATIC SITE SERVER SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode (Inject Vite Middleware)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware mounted');
  } else {
    // Production Mode (Serve bundled site assets)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static client files middleware mounted');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MCA Register Records Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
