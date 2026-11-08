import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/noto-sans-georgian/400.css';
import '@fontsource/noto-sans-georgian/500.css';
import '@fontsource/noto-sans-georgian/600.css';
import '@fontsource/noto-sans-georgian/700.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { usePrefs } from './prefs.js';

// Switching the language remounts the app, so every L(...) string is read again.
function ByLanguage() {
  const { lang } = usePrefs();
  return <App key={lang} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* "/" locally; "/hospes" on GitHub Pages (vite build --base=/hospes/) */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ByLanguage />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
