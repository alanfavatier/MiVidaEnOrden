// Componentes reutilizables de interfaz.

import { useEffect, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** Modal tipo hoja inferior en celular, centrado en escritorio. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="icon-btn icon-btn--bare" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Diálogo de confirmación. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="small muted" style={{ lineHeight: 1.6 }}>
        {message}
      </div>
      {children}
      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Barra de progreso. */
export function Progress({
  value,
  variant = 'accent',
  label = 'Progreso',
}: {
  value: number;
  variant?: 'accent' | 'success' | 'warning';
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const cls = variant === 'success' ? ' progress__fill--success' : variant === 'warning' ? ' progress__fill--warning' : '';
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress__fill${cls}`} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Estado vacío. */
export function EmptyState({ icon = 'list', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={34} />
      <div>{children}</div>
    </div>
  );
}

/** Tarjeta de estadística. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'success' | 'danger';
}) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value${tone ? ` stat__value--${tone}` : ''}`}>{value}</div>
      {hint ? <div className="stat__hint">{hint}</div> : null}
    </div>
  );
}

/** Campo de formulario. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
}

/** Botón con icono. */
export function IconButton({
  name,
  label,
  onClick,
  bare = false,
  className = '',
}: {
  name: IconName;
  label: string;
  onClick: () => void;
  bare?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-btn${bare ? ' icon-btn--bare' : ''} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      type="button"
    >
      <Icon name={name} />
    </button>
  );
}
