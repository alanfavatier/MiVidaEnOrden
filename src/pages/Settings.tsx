// Página Configuración: tema, copias de seguridad, datos e instrucciones.

import { useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { ConfirmDialog, Field, Modal } from '../components/ui';
import { downloadBackup, BackupError, parseBackupText } from '../lib/backup';
import { isStorageAvailable, STORAGE_KEYS } from '../lib/storage';
import { formatISO, todayISO } from '../lib/dates';
import { useOnline } from '../hooks/useOnline';

export function SettingsPage() {
  const { data, updatePreferences, clearAll, loadSeedData, importBackup, ready } = useStore();
  const online = useOnline();
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearTyped, setClearTyped] = useState('');
  const [importPreview, setImportPreview] = useState<{ text: string; counts: Record<string, number> } | null>(null);
  const [importError, setImportError] = useState('');
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState<'backup' | 'android' | 'iphone' | 'offline' | null>(null);

  function handleExport() {
    try {
      const filename = downloadBackup(data);
      setMessage(`Copia de seguridad descargada: ${filename}`);
      setShowHelp('backup');
    } catch {
      setMessage('No se pudo generar el archivo de copia de seguridad.');
    }
  }

  async function handleFile(file: File) {
    setImportError('');
    if (file.size > 20 * 1024 * 1024) {
      setImportError('El archivo es demasiado grande para ser una copia válida.');
      return;
    }
    try {
      const text = await file.text();
      const { counts } = parseBackupText(text);
      setImportPreview({ text, counts });
    } catch (err) {
      setImportError(err instanceof BackupError ? err.message : 'No se pudo leer el archivo.');
    }
  }

  function confirmImport() {
    if (!importPreview) return;
    try {
      const counts = importBackup(importPreview.text);
      setMessage(
        `Datos importados: ${counts.habits} hábitos, ${counts.goals} objetivos, ${counts.tasks} tareas, ` +
          `${counts.transactions} movimientos, ${counts.savingsGoals} objetivos de ahorro, ${counts.routines} rutinas.`,
      );
      setImportPreview(null);
      setImportError('');
    } catch (err) {
      setImportError(err instanceof BackupError ? err.message : 'Falló la importación.');
      setImportPreview(null);
    }
  }

  const counts = {
    hábitos: data.habits.length,
    objetivos: data.goals.length,
    tareas: data.tasks.length,
    rutinas: data.routines.length,
    movimientos: data.transactions.length,
    ahorros: data.savingsGoals.length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Preferencias, copias de seguridad e información de la app.</p>
      </div>

      {message && (
        <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="small">{message}</div>
        </div>
      )}
      {importError && (
        <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="small" style={{ color: 'var(--danger)' }}>{importError}</div>
        </div>
      )}

      {/* Preferencias */}
      <div className="section__title">Preferencias</div>
      <section className="section">
        <div className="card">
          <div className="switch-row">
            <div>
              <div style={{ fontWeight: 650 }}>Tema</div>
              <div className="tiny muted">
                Actual:{' '}
                {data.preferences.theme === 'dark' ? 'oscuro' : data.preferences.theme === 'pink' ? 'rosa' : 'claro'}
              </div>
            </div>
            <div className="pill-toggle">
              <button
                type="button"
                className={data.preferences.theme === 'dark' ? 'is-active' : ''}
                onClick={() => updatePreferences({ theme: 'dark' })}
              >
                <Icon name="moon" size={14} /> Oscuro
              </button>
              <button
                type="button"
                className={data.preferences.theme === 'light' ? 'is-active' : ''}
                onClick={() => updatePreferences({ theme: 'light' })}
              >
                <Icon name="sun" size={14} /> Claro
              </button>
              <button
                type="button"
                className={data.preferences.theme === 'pink' ? 'is-active' : ''}
                onClick={() => updatePreferences({ theme: 'pink' })}
              >
                <Icon name="heart" size={14} /> Rosa
              </button>
            </div>
          </div>
          <div className="divider" />
          <Field label="Tu nombre (opcional)" hint="Se usa solo para el saludo del inicio.">
            <input
              value={data.preferences.name}
              onChange={(e) => updatePreferences({ name: e.target.value })}
              placeholder="Ej.: Alan"
              maxLength={40}
            />
          </Field>
        </div>
      </section>

      {/* Copias de seguridad */}
      <div className="section__title">Copia de seguridad</div>
      <section className="section">
        <div className="card">
          <div className="card__title">Exportar mis datos</div>
          <p className="small muted" style={{ marginTop: 6 }}>
            Descarga un archivo JSON con todo: hábitos, objetivos, tareas, rutinas, movimientos,
            ahorros, desafío y preferencias.
          </p>
          <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={handleExport}>
            <Icon name="download" size={17} /> Exportar copia (JSON)
          </button>
          <button className="btn btn--ghost btn--sm btn--block" style={{ marginTop: 8 }} onClick={() => setShowHelp('backup')}>
            Cómo guardar la copia fuera del navegador
          </button>
        </div>

        <div className="card">
          <div className="card__title">Importar una copia</div>
          <p className="small muted" style={{ marginTop: 6 }}>
            Se valida el archivo antes de reemplazar los datos actuales y te pedimos confirmación.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button className="btn btn--ghost btn--block" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={17} /> Elegir archivo JSON
          </button>
        </div>

        <div className="card">
          <div className="card__title">Borrar todos los datos</div>
          <p className="small muted" style={{ marginTop: 6 }}>
            Elimina lo guardado en este navegador. No se puede deshacer sin una copia de seguridad.
          </p>
          <button className="btn btn--danger btn--block" style={{ marginTop: 12 }} onClick={() => setConfirmClear(true)}>
            <Icon name="trash" size={17} /> Borrar todos mis datos
          </button>
          <button className="btn btn--ghost btn--sm btn--block" style={{ marginTop: 8 }} onClick={() => { loadSeedData(); setMessage('Se cargaron los hábitos y objetivos sugeridos (solo los que faltaban).'); }}>
            Restablecer hábitos y objetivos sugeridos
          </button>
        </div>
      </section>

      {/* Almacenamiento */}
      <div className="section__title">Almacenamiento y privacidad</div>
      <section className="section">
        <div className="card">
          <div className="row row--between">
            <div className="small">localStorage disponible</div>
            <span className={`chip ${isStorageAvailable() ? 'chip--success' : 'chip--danger'}`}>
              {isStorageAvailable() ? 'Sí' : 'No'}
            </span>
          </div>
          <div className="row row--between" style={{ marginTop: 8 }}>
            <div className="small">Conexión</div>
            <span className={`chip ${online ? 'chip--success' : 'chip--warning'}`}>
              {online ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
          <div className="divider" />
          <div className="tiny muted" style={{ display: 'grid', gap: 4 }}>
            <span>Guardado: {ready ? 'activo' : 'cargando…'}</span>
            <span>Hábitos: {counts.hábitos} · Objetivos: {counts.objetivos} · Tareas: {counts.tareas}</span>
            <span>Rutinas: {counts.rutinas} · Movimientos: {counts.movimientos} · Ahorros: {counts.ahorros}</span>
            <span>Fecha de hoy: {formatISO(todayISO())}</span>
            <span>Claves: {Object.keys(STORAGE_KEYS).length} entradas en localStorage</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="card__title">Advertencia importante</div>
          <p className="small muted" style={{ marginTop: 6 }}>
            Tus datos se guardan <b>solo en este dispositivo y en este navegador</b>. No se envían a
            ningún servidor. Si borrás los datos del navegador o desinstalás la aplicación,{' '}
            <b>pueden perderse</b>. Hacé copias de seguridad periódicas y guardalas fuera del
            navegador (computadora, disco USB, correo a vos mismo, nube).
          </p>
        </div>

        <div className="card">
          <div className="card__title">Ayuda</div>
          <div className="row row--wrap" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowHelp('android')}>Instalar en Android</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowHelp('iphone')}>Instalar en iPhone</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowHelp('offline')}>Probar sin conexión</button>
          </div>
        </div>
      </section>

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 18 }}>
        Mi Vida en Orden · v1.0.0 · Sin cuentas, sin servidores, sin publicidad.
      </p>

      {/* Importar: previsualización y confirmación */}
      {importPreview && (
        <Modal title="Confirmar importación" onClose={() => setImportPreview(null)}>
          <p className="small">
            El archivo es válido. Al confirmar, <b>todos los datos actuales serán reemplazados</b> por
            los del archivo:
          </p>
          <ul className="small muted" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Hábitos: {importPreview.counts.habits}</li>
            <li>Objetivos: {importPreview.counts.goals}</li>
            <li>Tareas: {importPreview.counts.tasks}</li>
            <li>Rutinas: {importPreview.counts.routines}</li>
            <li>Movimientos: {importPreview.counts.transactions}</li>
            <li>Objetivos de ahorro: {importPreview.counts.savingsGoals}</li>
          </ul>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setImportPreview(null)}>Cancelar</button>
            <button className="btn btn--primary" onClick={confirmImport}>Reemplazar mis datos</button>
          </div>
        </Modal>
      )}

      {/* Borrar datos */}
      {confirmClear && (
        <ConfirmDialog
          title="Borrar todos los datos"
          danger
          confirmLabel="Borrar definitivamente"
          cancelLabel="Cancelar"
          message={
            <>
              Se eliminarán <b>tus hábitos, objetivos, tareas, rutinas, movimientos, ahorros y
              preferencias</b> guardados en este navegador. Esta acción no se puede deshercer sin una
              copia de seguridad.
              <div style={{ marginTop: 12 }}>
                Escribí <b>BORRAR</b> para confirmar:
              </div>
              <input
                value={clearTyped}
                onChange={(e) => setClearTyped(e.target.value)}
                placeholder="BORRAR"
                style={{ width: '100%', marginTop: 8, minHeight: 44, padding: '10px 12px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
                aria-label="Escribe BORRAR para confirmar"
              />
            </>
          }
          onCancel={() => {
            setConfirmClear(false);
            setClearTyped('');
          }}
          onConfirm={() => {
            if (clearTyped.trim().toUpperCase() !== 'BORRAR') {
              setMessage('Para borrar los datos tenés que escribir BORRAR en el campo de confirmación.');
              setConfirmClear(false);
              setClearTyped('');
              return;
            }
            clearAll();
            setConfirmClear(false);
            setClearTyped('');
            setMessage('Se borraron todos los datos de este navegador.');
          }}
        />
      )}

      {/* Ayuda */}
      {showHelp && (
        <Modal
          title={
            showHelp === 'android'
              ? 'Instalar en Android (Chrome)'
              : showHelp === 'iphone'
                ? 'Instalar en iPhone (Safari)'
                : showHelp === 'offline'
                  ? 'Probar sin conexión'
                  : 'Guardar tu copia de seguridad'
          }
          onClose={() => setShowHelp(null)}
        >
          <div className="small muted" style={{ lineHeight: 1.7, display: 'grid', gap: 10 }}>
            {showHelp === 'android' && (
              <>
                <p><b>1.</b> Abrí la app en Chrome con internet (primera carga).</p>
                <p><b>2.</b> Tocá el menú de los tres puntos → <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>.</p>
                <p><b>3.</b> Confirmá con <b>Instalar</b>. El ícono aparece en tu pantalla.</p>
                <p><b>4.</b> Una vez instalada y cargada, funciona sin conexión (modo avión).</p>
              </>
            )}
            {showHelp === 'iphone' && (
              <>
                <p><b>1.</b> Abrí la app en Safari con internet (primera carga).</p>
                <p><b>2.</b> Tocá el botón <b>Compartir</b> (el cuadrado con flecha).</p>
                <p><b>3.</b> Elegí <b>Agregar a pantalla de inicio</b> → <b>Agregar</b>.</p>
                <p><b>4.</b> Desde el ícono funciona a pantalla completa y sin conexión.</p>
                <p className="tiny">Nota: iOS no permite instalar desde Chrome; usá Safari.</p>
              </>
            )}
            {showHelp === 'offline' && (
              <>
                <p><b>1.</b> Cargá la app con internet al menos una vez y dejala abierta unos segundos.</p>
                <p><b>2.</b> Activá el modo avión (o desconectate del Wi‑Fi).</p>
                <p><b>3.</b> Cerrá y volvé a abrir la app desde el ícono.</p>
                <p><b>4.</b> El indicador debe decir <b>Sin conexión</b> y todas las secciones deben seguir funcionando.</p>
                <p><b>5.</b> Probá crear un hábito, una tarea y un movimiento: se guardan igual.</p>
                <p><b>6.</b> Desactivá el modo avión: la app se reconecta sin perder datos.</p>
              </>
            )}
            {showHelp === 'backup' && (
              <>
                <p><b>1.</b> Tocá <b>Exportar copia (JSON)</b>: se descarga un archivo con fecha en el nombre.</p>
                <p><b>2.</b> Guardalo <b>fuera del navegador</b>: computadora, pendrive, disco externo o tu nube personal.</p>
                <p><b>3.</b> Podés enviártelo por correo a vos mismo como recordatorio.</p>
                <p><b>4.</b> Para restaurar: <b>Configuración → Importar una copia</b> → elegí el archivo → confirmá.</p>
                <p><b>5.</b> Hacelo cada tanto y después de cargar datos importantes.</p>
                <p className="tiny" style={{ color: 'var(--warning)' }}>
                  El archivo contiene tu información personal y financiera: tratalo como privado.
                </p>
              </>
            )}
          </div>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={() => setShowHelp(null)}>Entendido</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
