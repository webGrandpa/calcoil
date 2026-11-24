import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startPwa } from './app/pwa';
import './styles.css';

startPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
