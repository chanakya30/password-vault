import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Theme, ThemeManager } from '../lib/theme';
import TwoFactorSetup from '../components/TwoFactorSetup';
import ThemeToggle from '../components/ThemeToggle';

const Settings: React.FC = () => {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('auto');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchSettings();
    ThemeManager.initialize();
    setTheme(ThemeManager.getStoredTheme());
  }, [router]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const settings = await response.json();
        setTheme(settings.theme || 'auto');
        setTwoFactorEnabled(settings.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    ThemeManager.setStoredTheme(newTheme);

    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:4000/api/settings/theme', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const disable2FA = async () => {
    const token = prompt('Enter your 2FA token to disable:');
    if (!token) return;

    try {
      const userToken = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/two-factor/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setTwoFactorEnabled(false);
        alert('2FA disabled successfully');
      } else {
        alert('Failed to disable 2FA');
      }
    } catch (error) {
      alert('Error disabling 2FA');
    }
  };

  const handle2FAComplete = () => {
    setShow2FASetup(false);
    setTwoFactorEnabled(true);
    alert('2FA enabled successfully!');
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              type="button"
            >
              Back to Vault
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            {/* Theme Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <ThemeToggle theme={theme} onThemeChange={updateTheme} />
            </div>

            {/* Security Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Security</h3>
              
              <div className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {twoFactorEnabled 
                      ? '2FA is enabled for your account' 
                      : 'Add an extra layer of security'
                    }
                  </p>
                </div>
                
                {twoFactorEnabled ? (
                  <button
                    onClick={disable2FA}
                    className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                    type="button"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    onClick={() => setShow2FASetup(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    type="button"
                  >
                    Enable 2FA
                  </button>
                )}
              </div>
            </div>

            {/* Export/Import Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/?action=export')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  type="button"
                >
                  Export Data
                </button>
                <button
                  onClick={() => router.push('/?action=import')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  type="button"
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {show2FASetup && (
        <TwoFactorSetup
          onComplete={handle2FAComplete}
          onCancel={() => setShow2FASetup(false)}
        />
      )}
    </div>
  );
};

export default Settings;