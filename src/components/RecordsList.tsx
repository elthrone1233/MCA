import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowUpDown, Trash2, ArrowLeft, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { RecordItem, ViewType } from '../types';

interface RecordsListProps {
  records: RecordItem[];
  onDeleteRecord: (pin: string) => Promise<void>;
  setView: (view: ViewType) => void;
  setPrintData: (data: { title: string; records: RecordItem[] }) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type SortType = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';

export default function RecordsList({ records, onDeleteRecord, setView, setPrintData, showToast }: RecordsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortType>('date-newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeletePin, setConfirmDeletePin] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // 1. Filtering & Sorting Logic
  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) => r.pin.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q)
      );
    }

    // Alphabetical filter
    if (selectedLetter) {
      result = result.filter((r) =>
        r.fullName.trim().toUpperCase().startsWith(selectedLetter)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.fullName.localeCompare(b.fullName);
        case 'name-desc':
          return b.fullName.localeCompare(a.fullName);
        case 'date-newest':
          return b.dateRegistered.localeCompare(a.dateRegistered);
        case 'date-oldest':
          return a.dateRegistered.localeCompare(b.dateRegistered);
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchQuery, selectedLetter, sortBy]);

  // 2. Pagination Logic
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / itemsPerPage));
  
  // Adjust page if current page exceeds bounds due to filtering
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredAndSortedRecords.slice(start, start + itemsPerPage);
  }, [filteredAndSortedRecords, safeCurrentPage]);

  // Handle deletion confirmation
  const handleDeleteClick = (pin: string) => {
    setConfirmDeletePin(pin);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeletePin) return;
    setIsDeleting(true);
    try {
      await onDeleteRecord(confirmDeletePin);
      setConfirmDeletePin(null);
    } catch (err) {
      // Error handled in parent toast
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintPreview = (printType: 'all' | 'filtered') => {
    const dataToPrint = printType === 'all' ? records : filteredAndSortedRecords;
    if (dataToPrint.length === 0) {
      showToast('No records available to print.', 'error');
      return;
    }
    setPrintData({
      title: printType === 'all' ? 'All Registered Records' : 'Filtered Registered Records',
      records: dataToPrint,
    });
    setView('print');
  };

  return (
    <div className="space-y-6" id="records-list-view">
      {/* Header and Print Dropdown / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">MCA Records</h1>
          <p className="text-neutral-500 mt-1">
            Display, search, sort, and filter synchronizations from Google Sheets database.
          </p>
        </div>

        {/* Print Preview Options Dropdown/Group */}
        <div className="flex items-center gap-2">
          <div className="relative inline-block text-left group">
            <button
              type="button"
              id="print-preview-button"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition duration-150 inline-flex items-center space-x-2 shadow-sm focus:outline-none"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>Print Preview</span>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-neutral-200/80 shadow-lg hidden group-hover:block hover:block z-20">
              <div className="p-1.5 space-y-1">
                <button
                  onClick={() => handlePrintPreview('all')}
                  className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition"
                >
                  Print All Records ({records.length})
                </button>
                <button
                  onClick={() => handlePrintPreview('filtered')}
                  className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition"
                  disabled={filteredAndSortedRecords.length === 0}
                >
                  Print Filtered Only ({filteredAndSortedRecords.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar Container */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
        {/* Search Input + Sort Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              placeholder="Search by PIN or Full Name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset page on filter
              }}
              className="block w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 text-sm placeholder-neutral-400"
            />
          </div>

          {/* Sorting */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <ArrowUpDown className="h-4.5 w-4.5" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-xl bg-white text-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 appearance-none cursor-pointer"
            >
              <option value="date-newest">Latest Registered</option>
              <option value="date-oldest">Oldest Registered</option>
              <option value="name-asc">Full Name A-Z</option>
              <option value="name-desc">Full Name Z-A</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Alphabetical Filter Tabs */}
        <div>
          <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
            Filter by Name Alphabetical
          </span>
          <div className="flex items-center flex-wrap gap-1">
            <button
              onClick={() => {
                setSelectedLetter(null);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                selectedLetter === null
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              ALL
            </button>
            {alphabet.map((letter) => (
              <button
                key={letter}
                onClick={() => {
                  setSelectedLetter(letter);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedLetter === letter
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Table Card */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-left">
            <thead className="bg-neutral-50 text-neutral-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">PIN</th>
                <th scope="col" className="px-6 py-4">Full Name</th>
                <th scope="col" className="px-6 py-4">Date Registered</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700 font-medium">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => (
                  <tr key={record.pin} className="hover:bg-neutral-50/50 transition">
                    <td className="px-6 py-4 font-mono text-neutral-900 font-bold">{record.pin}</td>
                    <td className="px-6 py-4 text-neutral-900 font-semibold">{record.fullName}</td>
                    <td className="px-6 py-4 text-neutral-500">{record.dateRegistered}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteClick(record.pin)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Delete Record"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {filteredAndSortedRecords.length > 0 && (
          <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-xs text-neutral-500 font-medium">
              Showing <strong className="text-neutral-700">{(safeCurrentPage - 1) * itemsPerPage + 1}</strong> to{' '}
              <strong className="text-neutral-700">
                {Math.min(safeCurrentPage * itemsPerPage, filteredAndSortedRecords.length)}
              </strong>{' '}
              of <strong className="text-neutral-700">{filteredAndSortedRecords.length}</strong> matching records
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-2 border border-neutral-200 rounded-xl bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-neutral-500 font-semibold font-mono">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-2 border border-neutral-200 rounded-xl bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deletion */}
      {confirmDeletePin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 max-w-md w-full mx-4 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 text-red-800 rounded-xl shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-lg">Confirm Deletion</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Are you sure you want to permanently delete record PIN <strong className="text-neutral-800 font-mono">{confirmDeletePin}</strong>? This will delete it from Google Sheets and local backups permanently.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setConfirmDeletePin(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold border border-neutral-200 rounded-xl bg-white text-neutral-600 hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 hover:shadow-md transition flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
