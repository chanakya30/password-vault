import React from 'react';
import { Theme, ThemeManager } from '../lib/theme';

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onThemeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Theme:</span>
      <select
        value={theme}
        onChange={(e) => onThemeChange(e.target.value as Theme)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
};

export default ThemeToggle;