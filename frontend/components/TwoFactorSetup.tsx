import React, { useState } from 'react';
// Remove the problematic import and use dynamic import or alternative

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setup2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/two-factor/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSecret(data.secret);
        setQrCodeUrl(data.qrCode);
        setStep('verify');
      } else {
        setError('Failed to setup 2FA');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/two-factor/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        onComplete();
      } else {
        setError('Invalid token');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
        
        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enable two-factor authentication for extra security.
            </p>
            <button
              onClick={setup2FA}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              type="button"
            >
              {loading ? 'Setting up...' : 'Setup 2FA'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Scan this QR code with your authenticator app:
            </p>
            
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Or enter secret manually:
              </p>
              <code className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm break-all">
                {secret}
              </code>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Enter verification code:
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={verify2FA}
                disabled={loading || token.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                type="button"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm mt-2">{error}</div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;