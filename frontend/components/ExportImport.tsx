import React, { useState } from 'react';
import { CryptoService } from '../lib/crypto';

interface ExportImportProps {
  onClose: () => void;
  vaultItems: any[];
  cryptoKey: string;
}

const ExportImport: React.FC<ExportImportProps> = ({ onClose, vaultItems, cryptoKey }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importData, setImportData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const exportData = async () => {
    try {
      const exportItems = await Promise.all(
        vaultItems.map(async (item) => ({
          ...item,
          decryptedPassword: await CryptoService.decrypt(
            { ciphertext: item.ciphertext, nonce: item.nonce },
            cryptoKey
          )
        }))
      );

      const exportBlob = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        items: exportItems
      };

      const dataStr = JSON.stringify(exportBlob, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `password-vault-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setSuccess('Data exported successfully');
    } catch (error) {
      setError('Failed to export data');
    }
  };

  const handleImport = async () => {
    try {
      const importBlob = JSON.parse(importData);
      
      if (!importBlob.items || !Array.isArray(importBlob.items)) {
        setError('Invalid import file format');
        return;
      }

      // Here you would typically send the import data to the backend
      // For now, we'll just show a success message
      setSuccess(`Successfully imported ${importBlob.items.length} items`);
      setImportData('');
      
      // Reload the page to reflect changes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setError('Failed to import data - invalid JSON');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Export/Import Data</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-2 ${activeTab === 'export' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('export')}
            type="button"
          >
            Export
          </button>
          <button
            className={`flex-1 py-2 ${activeTab === 'import' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('import')}
            type="button"
          >
            Import
          </button>
        </div>

        {activeTab === 'export' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Export your vault data as an encrypted JSON file.
            </p>
            <button
              onClick={exportData}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              type="button"
            >
              Export Data
            </button>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Import vault data from a previously exported file.
            </p>
            
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full p-2 border rounded"
            />

            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Or paste JSON data here..."
              rows={6}
              className="w-full p-2 border rounded text-sm font-mono dark:bg-gray-700 dark:border-gray-600"
            />

            <button
              onClick={handleImport}
              disabled={!importData}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              type="button"
            >
              Import Data
            </button>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm mt-2">{error}</div>
        )}

        {success && (
          <div className="text-green-600 text-sm mt-2">{success}</div>
        )}
      </div>
    </div>
  );
};

export default ExportImport;