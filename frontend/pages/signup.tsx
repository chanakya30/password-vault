import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '../lib/auth';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords using authService
    if (password.length < 6) {
      setError('Account password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const masterPasswordValidation = authService.validateMasterPassword(masterPassword);
    if (!masterPasswordValidation.valid) {
      setError(masterPasswordValidation.errors[0]);
      setLoading(false);
      return;
    }

    if (masterPassword !== confirmMasterPassword) {
      setError('Master passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Use authService for signup
      const result = await authService.signup(email, password, masterPassword);
      
      // Store authentication data using authService
      authService.setToken(result.token);
      authService.setUserId(result.userId);
      authService.generateAndSetSalt();
      
      // Store master password flag
      if (typeof window !== 'undefined') {
        localStorage.setItem('masterPasswordSet', 'true');
      }

      // Redirect to vault (will require master password to unlock)
      router.push('/');
    } catch (error: any) {
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Password Vault Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Password Vault</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Secure your digital life</p>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Create Your Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Credentials */}
          <div className="border-b dark:border-gray-600 pb-4">
            <h3 className="text-lg font-semibold mb-3 dark:text-gray-300">Account Information</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                autoComplete="email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Account Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used to log into your account (min. 6 characters)
              </p>
            </div>
          </div>

          {/* Master Password */}
          <div>
            <h3 className="text-lg font-semibold mb-3 dark:text-gray-300">Vault Security</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Master Password</label>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used to unlock your vault (min. 8 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Confirm Master Password</label>
              <input
                type="password"
                value={confirmMasterPassword}
                onChange={(e) => setConfirmMasterPassword(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Important:</strong> Your master password is used to unlock your vault. 
              It must match the password you set during signup. If you forget it, you will lose access to your passwords.
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm dark:text-gray-300">
          Already have an account?{' '}
          <a 
            href="/login" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;