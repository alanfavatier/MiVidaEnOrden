import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { StoreProvider } from './store/store';
import './styles/global.css';

// Registra el Service Worker para que la app funcione sin conexión.
// La actualización nunca borra datos: todo vive en localStorage.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Se muestra un aviso discreto para aplicar la nueva versión cuando el usuario quiera.
    const ok = window.confirm(
      'Hay una nueva versión de Mi Vida en Orden disponible.\n\n¿Querés actualizarla ahora? Tus datos no se pierden.',
    );
    if (ok) updateSW(true);
  },
  onOfflineReady() {
    console.info('[PWA] App lista para usarse sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
