import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { RecordItem, ViewType } from '../types';

interface PrintPreviewProps {
  printTitle: string;
  records: RecordItem[];
  setView: (view: ViewType) => void;
  footerText?: string;
}

export default function PrintPreview({ printTitle, records, setView, footerText }: PrintPreviewProps) {
  
  // Clean up print classes on unmount
  useEffect(() => {
    document.body.classList.add('print-preview-active');
    return () => {
      document.body.classList.remove('print-preview-active');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8" id="print-preview-panel">
      {/* Dynamic Print Styles for A4 Landscape & Header Repetitions */}
      <style>{`
        /* CSS rules applied only for screen preview helper */
        .print-paper-preview {
          background-color: white;
          border: 1px solid #e5e5e5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-radius: 12px;
          padding: 2.5cm;
          min-height: 210mm; /* A4 height in landscape */
        }

        /* Printing Specific overrides */
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Hide non-printable navigation, header, buttons */
          .no-print,
          header,
          nav,
          aside,
          button,
          .toast-container {
            display: none !important;
          }

          /* Force exact A4 Landscape sizing */
          @page {
            size: A4 landscape;
            margin: 1.5cm;
          }

          /* Unpack the preview frame for real print paper margins */
          .print-paper-preview {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          /* Ensure table headers repeat on every single page */
          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Control Buttons - Hidden during printing */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-neutral-100 p-4 rounded-2xl border border-neutral-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('records')}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition flex items-center space-x-1.5 focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Records</span>
          </button>
          <div className="text-xs text-neutral-500">
            <span>Viewing: </span>
            <strong className="text-neutral-700 font-medium">{printTitle} ({records.length} records)</strong>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition duration-150 inline-flex items-center justify-center space-x-2 shadow-sm focus:outline-none"
        >
          <Printer className="h-4.5 w-4.5" />
          <span>Execute Print / Save PDF</span>
        </button>
      </div>

      {/* Printable Sheet (Simulating Landscape A4 Paper) */}
      <div className="print-paper-preview space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-neutral-300">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 uppercase">MCA Register Records</h2>
          <p className="text-xs text-neutral-500 font-semibold tracking-wider uppercase font-mono">Official System Record Sheet</p>
          <p className="text-[10px] text-neutral-400">Generated on: {new Date().toLocaleDateString()} | Records Count: {records.length}</p>
        </div>

        <table className="min-w-full text-left border-collapse border border-neutral-300 text-sm">
          <thead className="bg-neutral-50 text-neutral-800 font-bold uppercase text-[11px] tracking-wider">
            <tr>
              <th scope="col" className="border border-neutral-300 px-4 py-3 w-1/6">PIN</th>
              <th scope="col" className="border border-neutral-300 px-4 py-3 w-5/12">Full Name</th>
              <th scope="col" className="border border-neutral-300 px-4 py-3 w-6/12">Address</th>
            </tr>
          </thead>
          <tbody className="text-neutral-900 font-mono text-xs">
            {records.map((record) => (
              <tr key={record.pin} className="break-inside-avoid">
                <td className="border border-neutral-300 px-4 py-3 font-bold">{record.pin}</td>
                <td className="border border-neutral-300 px-4 py-3 font-semibold">{record.fullName}</td>
                <td className="border border-neutral-300 px-4 py-3 text-neutral-300 text-center select-none font-sans font-normal tracking-widest">
                  __________________________________________________
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer info repeating or final marker */}
        <div className="pt-8 flex justify-between text-[10px] text-neutral-400 font-mono uppercase">
          <span>{footerText || 'MCA Register Records System'}</span>
          <span>Sign / Stamp: ____________________________</span>
        </div>
      </div>
    </div>
  );
}
