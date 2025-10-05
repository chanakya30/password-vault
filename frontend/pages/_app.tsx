import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { ThemeManager } from '../lib/theme';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    ThemeManager.initialize();
  }, []);

  return <Component {...pageProps} />;
}