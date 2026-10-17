import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer, X, Shield, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../lib/api';
import toast from 'react-hot-toast';

interface DataExporterProps {
  variant?: 'button' | 'dropdown' | 'inline';
}

export const DataExporter = ({ variant = 'button' }: DataExporterProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExportCsv = async () => {
    try {
      setDownloading('csv');
      const response = await fetch(getApiUrl('/api/export?format=csv'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to generate CSV export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSense-Transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Transactions CSV downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error exporting CSV');
    } finally {
      setDownloading(null);
    }
  };

  const handleExportJson = async () => {
    try {
      setDownloading('json');
      const response = await fetch(getApiUrl('/api/export?format=json'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to generate JSON backup');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSense-Complete-Backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Full financial backup JSON downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Error exporting JSON');
    } finally {
      setDownloading(null);
    }
  };

  const handlePrintReport = async () => {
    try {
      setDownloading('print');
      const response = await fetch(getApiUrl('/api/export?format=json'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch data for report');

      const data = await response.json();
      
      // Open print window with formatted layout
      const printWin = window.open('', '_blank', 'width=850,height=900');
      if (!printWin) {
        toast.error('Please allow popups to open the printable financial report');
        return;
      }

      const txnsHtml = (data.transactions || []).slice(0, 50).map((t: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 8px 10px;">${new Date(t.date).toLocaleDateString()}</td>
          <td style="padding: 8px 10px;">${t.description || 'General'}</td>
          <td style="padding: 8px 10px;">${t.category?.name || 'Uncategorized'}</td>
          <td style="padding: 8px 10px; font-weight: bold; color: ${t.type === 'INCOME' ? '#059669' : '#dc2626'}; text-align: right;">
            ${t.type === 'INCOME' ? '+' : '-'}₹${Number(t.amount).toLocaleString('en-IN')}
          </td>
        </tr>
      `).join('');

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>FinSense Financial Report - ${data.user?.name || 'Personal Account'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
            .stats { display: flex; gap: 20px; margin-bottom: 25px; }
            .stat-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .stat-value { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
            .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">FinSense Financial Statement</h1>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Statement for: <strong>${data.user?.name || data.user?.email}</strong> (${data.user?.email})</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Net Balance</div>
              <div class="stat-value">₹${Number(data.summary?.netBalance || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Connected Accounts</div>
              <div class="stat-value">${data.summary?.accountsCount || 0} Accounts</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Recorded Transactions</div>
              <div class="stat-value">${data.summary?.transactionsCount || 0} Records</div>
            </div>
          </div>

          <h3 style="margin-bottom: 8px; font-size: 16px;">Recent Transactions Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txnsHtml}
            </tbody>
          </table>

          <div class="footer">
            Generated via FinSense Personal Finance & Spending Advisor. This statement is confidential and prepared for personal reference and tax records.
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Error generating print report');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-xs cursor-pointer"
        title="Export Financial Records"
      >
        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Export Data</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                    Export Financial Data
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Download for reference, tax records, or a second opinion
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-5 space-y-3">
              {/* Option 1: CSV */}
              <button
                onClick={handleExportCsv}
                disabled={downloading !== null}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      Transactions CSV Spreadsheet
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      All date, amount, category & account records for Excel/Sheets
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {downloading === 'csv' ? 'Exporting...' : '.CSV →'}
                </span>
              </button>

              {/* Option 2: Printable PDF / Report */}
              <button
                onClick={handlePrintReport}
                disabled={downloading !== null}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      Printable Financial Statement
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Clean formatted statement ready to print or save as PDF
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {downloading === 'print' ? 'Loading...' : 'Print →'}
                </span>
              </button>

              {/* Option 3: Full Backup JSON */}
              <button
                onClick={handleExportJson}
                disabled={downloading !== null}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      Full Financial Backup (JSON)
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Complete archive including accounts, budgets, and goals
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {downloading === 'json' ? 'Exporting...' : '.JSON →'}
                </span>
              </button>
            </div>

            {/* Audit compliance badge */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Exports are logged for security and authorized by your session.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
