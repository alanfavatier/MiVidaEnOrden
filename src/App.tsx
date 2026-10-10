import { useEffect, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { useStore } from './store/store';
import { useOnline } from './hooks/useOnline';
import { HomePage } from './pages/Home';
import { HabitsPage } from './pages/Habits';
import { GoalsPage } from './pages/Goals';
import { AgendaPage } from './pages/Agenda';
import { FinancesPage } from './pages/Finances';
import { SettingsPage } from './pages/Settings';
import type { Route } from './pages/types';

const NAV: { route: Route; label: string; icon: IconName; title: string }[] = [
  { route: 'inicio', label: 'Inicio', icon: 'home', title: 'Inicio' },
  { route: 'habitos', label: 'Hábitos', icon: 'check', title: 'Hábitos y disciplina' },
  { route: 'objetivos', label: 'Objetivos', icon: 'target', title: 'Objetivos personales' },
  { route: 'agenda', label: 'Agenda', icon: 'calendar', title: 'Agenda y planificación' },
  { route: 'finanzas', label: 'Finanzas', icon: 'wallet', title: 'Finanzas personales' },
  { route: 'ajustes', label: 'Ajustes', icon: 'settings', title: 'Configuración' },
];

function isValidRoute(v: string): v is Route {
  return NAV.some((n) => n.route === v);
}

export default function App() {
  const { data, notice, clearNotice, updatePreferences } = useStore();
  const online = useOnline();
  const [route, setRoute] = useState<Route>(() => {
    const hash = window.location.hash.replace('#', '');
    return isValidRoute(hash) ? hash : 'inicio';
  });

  // Sincroniza la ruta con el hash para que el botón "atrás" funcione.
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (isValidRoute(hash)) setRoute(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    setRoute(r);
    window.location.hash = r;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tema claro/oscuro.
  useEffect(() => {
    document.documentElement.dataset.theme = data.preferences.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', data.preferences.theme === 'dark' ? '#0f1115' : '#f4f6fb');
  }, [data.preferences.theme]);

  // Aviso no bloqueante (errores de guardado, etc.).
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 6000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  const current = NAV.find((n) => n.route === route) ?? NAV[0];

  return (
    <div className="app-shell">
      <nav className="side-nav" aria-label="Navegación principal">
        <div className="side-nav__brand">
          <Icon name="sparkles" size={26} />
          Mi Vida en Orden
        </div>
        {NAV.map((item) => (
          <button
            key={item.route}
            className={`side-nav__item${route === item.route ? ' is-active' : ''}`}
            onClick={() => navigate(item.route)}
            aria-current={route === item.route ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
        <div className="side-nav__footer">
          Todos los datos se guardan solo en este dispositivo.
        </div>
      </nav>

      <header className="app-header">
        <div className="app-header__title">{current.title}</div>
        <div className="app-header__actions">
          <span
            className={`conn-badge${online ? '' : ' is-offline'}`}
            title={online ? 'Conectado' : 'Sin conexión: la app sigue funcionando'}
          >
            <span className="conn-badge__dot" />
            {online ? 'En línea' : 'Sin conexión'}
          </span>
          <button
            className="icon-btn"
            onClick={() =>
              updatePreferences({
                theme: data.preferences.theme === 'dark' ? 'light' : 'dark',
              })
            }
            aria-label={data.preferences.theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title="Cambiar tema"
          >
            <Icon name={data.preferences.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {route === 'inicio' && <HomePage onNavigate={navigate} />}
        {route === 'habitos' && <HabitsPage />}
        {route === 'objetivos' && <GoalsPage />}
        {route === 'agenda' && <AgendaPage />}
        {route === 'finanzas' && <FinancesPage />}
        {route === 'ajustes' && <SettingsPage />}
      </main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {NAV.map((item) => (
          <button
            key={item.route}
            className={`bottom-nav__item${route === item.route ? ' is-active' : ''}`}
            onClick={() => navigate(item.route)}
            aria-current={route === item.route ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      {notice ? (
        <div className="toast toast--error" role="alert">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
