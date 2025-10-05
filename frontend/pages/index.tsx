import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PasswordGenerator from '../components/PasswordGenerator';
import ExportImport from '../components/ExportImport';
import ThemeToggle from '../components/ThemeToggle';
import { CryptoService } from '../lib/crypto';
import { Theme, ThemeManager } from '../lib/theme';

interface VaultItem {
  _id: string;
  ciphertext: string;
  nonce: string;
  meta: {
    name: string;
    website?: string;
    username?: string;
    note?: string;
    tags?: string[];
    folder?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const Vault: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('auto');
  const [tags, setTags] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    username: '',
    password: '',
    note: '',
    tags: '',
    folder: 'General'
  });

  const [cryptoKey, setCryptoKey] = useState<string | null>(null);
  const [salt, setSalt] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMasterPasswordPrompt, setShowMasterPasswordPrompt] = useState(false);
  const [masterPasswordError, setMasterPasswordError] = useState('');
  const [masterPasswordLoading, setMasterPasswordLoading] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
    const savedSalt = localStorage.getItem('salt');
    
    if (savedSalt) {
      setSalt(savedSalt);
    } else {
      const newSalt = CryptoService.generateSalt();
      setSalt(newSalt);
      localStorage.setItem('salt', newSalt);
    }

    // Initialize theme
    ThemeManager.initialize();
    setTheme(ThemeManager.getStoredTheme());
    
    setLoading(false);
    // Show master password prompt after authentication check
    setShowMasterPasswordPrompt(true);
  }, [router]);

  useEffect(() => {
    // Extract unique tags and folders from items
    if (items.length > 0) {
      const allTags = items.flatMap(item => item.meta.tags || []);
      const uniqueTags = Array.from(new Set(allTags)).filter(Boolean);
      setTags(uniqueTags as string[]);

      const allFolders = items.map(item => item.meta.folder || 'General');
      const uniqueFolders = Array.from(new Set(allFolders)).filter(Boolean);
      setFolders(uniqueFolders as string[]);
    }
  }, [items]);

  const verifyMasterPassword = async (password: string) => {
    setMasterPasswordLoading(true);
    setMasterPasswordError('');

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      const response = await fetch(`http://localhost:4000/api/auth/verify-master-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId, 
          masterPassword: password 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Master password is correct - unlock vault
        localStorage.setItem('vaultToken', data.vaultToken);
        setShowMasterPasswordPrompt(false);
        deriveKey(password); // Use the same password for crypto key derivation
      } else {
        setMasterPasswordError(data.error || 'Invalid master password');
      }
    } catch (error) {
      console.error('Master password verification error:', error);
      setMasterPasswordError('Network error. Please try again.');
    } finally {
      setMasterPasswordLoading(false);
    }
  };

  const handleMasterPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPasswordInput.trim()) {
      setMasterPasswordError('Please enter your master password');
      return;
    }
    verifyMasterPassword(masterPasswordInput);
  };

  const deriveKey = async (password: string) => {
    try {
      const key = await CryptoService.deriveKey(password, salt);
      setCryptoKey(key);
      fetchVaultItems();
    } catch (error) {
      alert('Failed to derive encryption key. Please try again.');
      setShowMasterPasswordPrompt(true);
    }
  };

  const fetchVaultItems = async () => {
    const token = localStorage.getItem('token');
    const vaultToken = localStorage.getItem('vaultToken');
    
    try {
      const response = await fetch(`http://localhost:4000/api/vault`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Vault-Token': vaultToken || ''
        },
      });
      
      if (response.ok) {
        const vaultItems = await response.json();
        setItems(vaultItems);
      } else if (response.status === 401) {
        // Vault access denied - require master password again
        localStorage.removeItem('vaultToken');
        setShowMasterPasswordPrompt(true);
        setMasterPasswordError('Vault access expired. Please enter master password again.');
      } else if (response.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('vaultToken');
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch vault items:', error);
    }
  };

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    ThemeManager.setStoredTheme(newTheme);
  };

  const encryptAndSave = async () => {
    if (!cryptoKey || !formData.name || !formData.password) return;

    try {
      const encrypted = await CryptoService.encrypt(formData.password, cryptoKey);
      const token = localStorage.getItem('token');
      const vaultToken = localStorage.getItem('vaultToken');
      
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      const payload = {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        meta: {
          name: formData.name,
          website: formData.website,
          username: formData.username,
          note: formData.note,
          tags: tagsArray,
          folder: formData.folder || 'General'
        }
      };

      const url = editingItem 
        ? `http://localhost:4000/api/vault/${editingItem._id}`
        : `http://localhost:4000/api/vault`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Vault-Token': vaultToken || ''
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({ 
          name: '', 
          website: '', 
          username: '', 
          password: '', 
          note: '',
          tags: '',
          folder: 'General'
        });
        setShowAddForm(false);
        setEditingItem(null);
        fetchVaultItems();
      } else if (response.status === 401) {
        // Vault access expired
        localStorage.removeItem('vaultToken');
        setShowMasterPasswordPrompt(true);
        setMasterPasswordError('Session expired. Please enter master password again.');
      }
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const decryptPassword = async (item: VaultItem): Promise<string> => {
    if (!cryptoKey) return '';
    
    try {
      return await CryptoService.decrypt(
        { ciphertext: item.ciphertext, nonce: item.nonce },
        cryptoKey
      );
    } catch (error) {
      return 'Decryption failed';
    }
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 10000);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const token = localStorage.getItem('token');
    const vaultToken = localStorage.getItem('vaultToken');
    
    try {
      const response = await fetch(`http://localhost:4000/api/vault/${itemId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Vault-Token': vaultToken || ''
        },
      });

      if (response.ok) {
        fetchVaultItems();
      } else if (response.status === 401) {
        localStorage.removeItem('vaultToken');
        setShowMasterPasswordPrompt(true);
        setMasterPasswordError('Session expired. Please enter master password again.');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const startEdit = async (item: VaultItem) => {
    setEditingItem(item);
    setFormData({
      name: item.meta.name,
      website: item.meta.website || '',
      username: item.meta.username || '',
      password: await decryptPassword(item),
      note: item.meta.note || '',
      tags: (item.meta.tags || []).join(', '),
      folder: item.meta.folder || 'General'
    });
    setShowAddForm(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.meta.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meta.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meta.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meta.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = !selectedTag || (item.meta.tags || []).includes(selectedTag);
    const matchesFolder = !selectedFolder || (item.meta.folder || 'General') === selectedFolder;

    return matchesSearch && matchesTag && matchesFolder;
  });

  // Master Password Prompt Modal
  if (showMasterPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Password Vault</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Secure your digital life</p>
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Unlock Your Vault</h2>
          
          <form onSubmit={handleMasterPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Master Password
              </label>
              <input
                type="password"
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your master password"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This must match the master password you set during signup
              </p>
            </div>

            {masterPasswordError && (
              <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {masterPasswordError}
              </div>
            )}

            <button
              type="submit"
              disabled={masterPasswordLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {masterPasswordLoading ? 'Unlocking Vault...' : 'Unlock Vault'}
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('vaultToken');
                router.push('/login');
              }}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">Redirecting to login...</div>;
  }

  if (!cryptoKey) {
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">Unlocking vault...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Password Vault</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} onThemeChange={updateTheme} />
            <button
              onClick={() => router.push('/settings')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
              type="button"
            >
              Settings
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('vaultToken');
                localStorage.removeItem('salt');
                router.push('/login');
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
              {/* Search and Filter Section */}
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search vault..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  type="button"
                >
                  Add Item
                </button>
                <button
                  onClick={() => setShowGenerator(!showGenerator)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  type="button"
                >
                  Generator
                </button>
                <button
                  onClick={() => setShowExportImport(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  type="button"
                >
                  Export/Import
                </button>
              </div>

              {/* Filter Section */}
              <div className="flex gap-4 mb-6">
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
                >
                  <option value="">All Folders</option>
                  {folders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
                
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
                >
                  <option value="">All Tags</option>
                  {tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="mb-6 p-4 border rounded dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Website"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="password"
                      placeholder="Password *"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Tags (comma separated)"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <select
                      value={formData.folder}
                      onChange={(e) => setFormData({...formData, folder: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="General">General</option>
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Finance">Finance</option>
                      <option value="Social">Social</option>
                    </select>
                    <textarea
                      placeholder="Note"
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white md:col-span-2"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={encryptAndSave}
                      disabled={!formData.name || !formData.password}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      type="button"
                    >
                      {editingItem ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingItem(null);
                        setFormData({ 
                          name: '', 
                          website: '', 
                          username: '', 
                          password: '', 
                          note: '',
                          tags: '',
                          folder: 'General'
                        });
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Vault Items */}
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <div key={item._id} className="border rounded p-4 dark:border-gray-600 dark:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.meta.name}</h4>
                        {item.meta.website && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.meta.website}</p>
                        )}
                        {item.meta.username && (
                          <p className="text-sm text-gray-700 dark:text-gray-200">Username: {item.meta.username}</p>
                        )}
                        {item.meta.folder && item.meta.folder !== 'General' && (
                          <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs px-2 py-1 rounded mr-2">
                            {item.meta.folder}
                          </span>
                        )}
                        {item.meta.tags && item.meta.tags.map(tag => (
                          <span key={tag} className="inline-block bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs px-2 py-1 rounded mr-2">
                            {tag}
                          </span>
                        ))}
                        {item.meta.note && (
                          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">{item.meta.note}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const password = await decryptPassword(item);
                            copyToClipboard(password, item._id);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          type="button"
                        >
                          {copiedId === item._id ? 'Copied!' : 'Copy Password'}
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No items found. {searchTerm || selectedTag || selectedFolder ? 'Try changing your filters.' : 'Add your first password item!'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Password Generator Sidebar */}
          <div>
            {showGenerator && (
              <PasswordGenerator onPasswordGenerated={(password) => {
                setFormData({...formData, password});
                setShowGenerator(false);
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Export/Import Modal */}
      {showExportImport && (
        <ExportImport
          onClose={() => setShowExportImport(false)}
          vaultItems={items}
          cryptoKey={cryptoKey!}
        />
      )}
    </div>
  );
};

export default Vault; 