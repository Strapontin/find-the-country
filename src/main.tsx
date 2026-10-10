import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// B612: the typeface Airbus designed for cockpit displays. Self-hosted, no third-party request.
import '@fontsource/b612/400.css';
import '@fontsource/b612/700.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
