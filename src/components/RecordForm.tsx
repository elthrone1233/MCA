import React, { useState } from 'react';
import { UserPlus, Hash, FileSignature, RotateCcw, Save } from 'lucide-react';
import { RecordItem } from '../types';

interface RecordFormProps {
  records: RecordItem[];
  onRecordSaved: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function RecordForm({ records, onRecordSaved, showToast }: RecordFormProps) {
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ pin?: string; fullName?: string }>({});

  const validate = () => {
    const tempErrors: { pin?: string; fullName?: string } = {};
    let isValid = true;

    if (!pin.trim()) {
      tempErrors.pin = 'PIN cannot be empty.';
      isValid = false;
    } else if (!/^\d{12}$/.test(pin.trim())) {
      tempErrors.pin = 'PIN must be exactly 12 numeric digits (0-9).';
      isValid = false;
    } else {
      // Check for duplicates on client side before sending
      const isDuplicate = records.some(
        (r) => r.pin.toLowerCase().trim() === pin.toLowerCase().trim()
      );
      if (isDuplicate) {
        tempErrors.pin = 'Duplicate PIN is not allowed. This PIN is already registered.';
        isValid = false;
      }
    }

    if (!fullName.trim()) {
      tempErrors.fullName = 'Full Name cannot be empty.';
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleClear = () => {
    setPin('');
    setFullName('');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Please correct form errors.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('session_token');
      let res;
      try {
        res = await fetch('/api/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ pin: pin.trim(), fullName: fullName.trim() }),
        });
      } catch (netErr) {
        // Fallback to localStorage save directly on static deployment
        const savedRecordsStr = localStorage.getItem('mca_records') || '[]';
        let savedRecords = [];
        try { savedRecords = JSON.parse(savedRecordsStr); } catch (e) {}
        const dateStr = new Date().toISOString().split('T')[0];
        const newRecord = { pin: pin.trim(), fullName: fullName.trim(), dateRegistered: dateStr };
        savedRecords.unshift(newRecord);
        localStorage.setItem('mca_records', JSON.stringify(savedRecords));
        showToast('Record saved directly to browser storage (Static Fallback Mode).', 'success');
        handleClear();
        await onRecordSaved();
        return;
      }

      if (res && res.status === 404) {
        const savedRecordsStr = localStorage.getItem('mca_records') || '[]';
        let savedRecords = [];
        try { savedRecords = JSON.parse(savedRecordsStr); } catch (e) {}
        const dateStr = new Date().toISOString().split('T')[0];
        const newRecord = { pin: pin.trim(), fullName: fullName.trim(), dateRegistered: dateStr };
        savedRecords.unshift(newRecord);
        localStorage.setItem('mca_records', JSON.stringify(savedRecords));
        showToast('Record saved directly to browser storage (Static Fallback Mode).', 'success');
        handleClear();
        await onRecordSaved();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save record.');
      }

      showToast(data.message || 'Record saved successfully!', 'success');
      handleClear();
      // Reload parent state records
      await onRecordSaved();
    } catch (err: any) {
      showToast(err.message || 'Could not save record.', 'error');
      setErrors({ pin: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="register-form-view">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">MCA Register Records Form</h1>
        <p className="text-neutral-500 mt-1">
          Create and sync new member/asset records into Google Sheets securely.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div className="bg-neutral-900 px-6 py-4 flex items-center space-x-3 text-white">
          <UserPlus className="h-5 w-5" />
          <h2 className="font-semibold tracking-wide text-sm uppercase">Record Registration Panel</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* PIN Field */}
          <div>
            <label htmlFor="pin-input" className="block text-sm font-semibold text-neutral-700">
              PIN (Exactly 12 Digits Required) <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Hash className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="pin-input"
                name="pin"
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // only allow numbers
                placeholder="e.g. 100020003000"
                className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-neutral-900 focus:outline-none focus:ring-2 sm:text-sm placeholder-neutral-400 ${
                  errors.pin 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/20' 
                    : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
                }`}
              />
            </div>
            {errors.pin && (
              <p className="mt-1.5 text-xs text-red-600 font-medium" id="pin-error-message">
                {errors.pin}
              </p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName-input" className="block text-sm font-medium text-neutral-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <FileSignature className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="fullName-input"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-neutral-900 focus:outline-none focus:ring-2 sm:text-sm placeholder-neutral-400 ${
                  errors.fullName 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/20' 
                    : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1.5 text-xs text-red-600 font-medium" id="fullname-error-message">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Buttons Panel */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleClear}
              id="clear-form-button"
              className="px-5 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 bg-white hover:bg-neutral-50 hover:text-neutral-800 transition duration-150 inline-flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear Form</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="save-record-button"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition duration-150 inline-flex items-center justify-center space-x-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
