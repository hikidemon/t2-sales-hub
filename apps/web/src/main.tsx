import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Style load order: design tokens (UI kit) → fonts → Tailwind layers + base rules.
import '@t2-sales-hub/ui/styles.css';
import './app/styles/fonts.css';
import './app/styles/globals.css';

import { App } from './app';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
