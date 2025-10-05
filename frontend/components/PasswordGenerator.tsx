import React, { useState } from 'react';

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onPasswordGenerated }) => {
  const [length, setLength] = useState(16);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeLetters, setIncludeLetters] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeLookAlikes, setExcludeLookAlikes] = useState(true);

  const generatePassword = () => {
    const numbers = '0123456789';
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const lookAlikes = '0Oo1lI';

    let charset = '';
    if (includeNumbers) charset += numbers;
    if (includeLetters) charset += letters;
    if (includeSymbols) charset += symbols;

    if (excludeLookAlikes) {
      charset = charset.split('').filter(char => !lookAlikes.includes(char)).join('');
    }

    if (charset.length === 0) {
      charset = letters + numbers;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    onPasswordGenerated(password);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Password Generator</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Length: {length}
          </label>
          <input
            type="range"
            min="8"
            max="32"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
              className="mr-2"
            />
            Include Numbers
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeLetters}
              onChange={(e) => setIncludeLetters(e.target.checked)}
              className="mr-2"
            />
            Include Letters
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => setIncludeSymbols(e.target.checked)}
              className="mr-2"
            />
            Include Symbols
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={excludeLookAlikes}
              onChange={(e) => setExcludeLookAlikes(e.target.checked)}
              className="mr-2"
            />
            Exclude Look-alikes (0O, 1l, etc.)
          </label>
        </div>

        <button
          onClick={generatePassword}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Generate Password
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;