// Página de Objetivos personales + desafío de 60 días.

import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Modal, ConfirmDialog, Progress, EmptyState, Field, IconButton } from '../components/ui';
import { formatISO, isValidISO, todayISO } from '../lib/dates';
import {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  challengeInfo,
  clampPercent,
  goalProgress,
  isOverdue,
  sortGoals,
  stepsDone,
} from '../lib/goals';
import { formatARS, parseAmount } from '../lib/money';
import { frequencyLabel } from './Habits';
import type { Goal, GoalCategory, GoalPriority, GoalStatus, GoalStep } from '../types';
import { uid } from '../lib/seed';

const emptyGoal = (): Goal => ({
  id: '',
  title: '',
  description: '',
  category: 'Carrera y tecnología',
  priority: 'media',
  startDate: null,
  dueDate: null,
  status: 'pendiente',
  steps: [],
  notes: '',
  budget: null,
  progress: 0,
  createdAt: '',
  updatedAt: '',
});

export function GoalsPage() {
  const { data, addGoal, updateGoal, deleteGoal, updateChallenge } = useStore();
  const today = todayISO();

  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState<'todas' | GoalCategory>('todas');
  const [filterStatus, setFilterStatus] = useState<'todos' | GoalStatus>('todos');
  const [budgetText, setBudgetText] = useState('');
  const [newStep, setNewStep] = useState('');

  const challenge = challengeInfo(data.challenge, today);
  const challengeHabits = data.habits.filter((h) => data.challenge.habitIds.includes(h.id));

  const goals = useMemo(() => {
    let list = data.goals;
    if (filterCat !== 'todas') list = list.filter((g) => g.category === filterCat);
    if (filterStatus !== 'todos') list = list.filter((g) => g.status === filterStatus);
    return sortGoals(list);
  }, [data.goals, filterCat, filterStatus]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Goal[]>();
    for (const g of goals) {
      const arr = map.get(g.category) ?? [];
      arr.push(g);
      map.set(g.category, arr);
    }
    return [...map.entries()];
  }, [goals]);

  function openCreate() {
    const g = emptyGoal();
    g.startDate = today;
    setEditing(g);
    setCreating(true);
    setBudgetText('');
    setNewStep('');
    setError('');
  }

  function openEdit(g: Goal) {
    setEditing({ ...g, steps: g.steps.map((s) => ({ ...s })) });
    setCreating(false);
    setBudgetText(g.budget !== null ? String(g.budget) : '');
    setNewStep('');
    setError('');
  }

  function save() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return setError('Ingresá un título para el objetivo.');
    if (editing.startDate && !isValidISO(editing.startDate)) return setError('La fecha de inicio no es válida.');
    if (editing.dueDate && !isValidISO(editing.dueDate)) return setError('La fecha límite no es válida.');
    if (editing.startDate && editing.dueDate && editing.dueDate < editing.startDate)
      return setError('La fecha límite no puede ser anterior a la fecha de inicio.');

    let budget: number | null = null;
    if (budgetText.trim()) {
      const parsed = parseAmount(budgetText);
      if (parsed === null || parsed < 0) return setError('El presupuesto debe ser un importe válido en pesos.');
      budget = parsed;
    }

    const payload: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      description: editing.description.trim(),
      category: editing.category,
      priority: editing.priority,
      startDate: editing.startDate || null,
      dueDate: editing.dueDate || null,
      status: editing.status,
      steps: editing.steps,
      notes: editing.notes.trim(),
      budget,
      progress: editing.status === 'completado' ? 100 : clampPercent(editing.progress),
    };

    if (creating) addGoal(payload);
    else updateGoal(editing.id, payload);
    setEditing(null);
    setError('');
  }

  const done = data.goals.filter((g) => g.status === 'completado').length;

  return (
    <div>
      <div className="page-header">
        <div className="row row--between">
          <div>
            <h1>Objetivos</h1>
            <p>
              {data.goals.length} objetivos · {done} completados
            </p>
          </div>
          <button className="btn btn--primary" onClick={openCreate}>
            <Icon name="plus" /> Nuevo
          </button>
        </div>
      </div>

      {/* Desafío de 60 días */}
      <section className="section">
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Desafío físico de 60 días</div>
              <div className="card__subtitle">
                {challenge.active
                  ? `Día ${challenge.currentDay} de ${data.challenge.totalDays} · desde ${formatISO(challenge.startDate)}`
                  : 'Sin iniciar. Elegí la fecha que quieras.'}
              </div>
            </div>
            <span className={`chip ${challenge.active ? 'chip--accent' : ''}`}>
              <Icon name="flame" size={13} /> {challenge.active ? `${challenge.progress}%` : '—'}
            </span>
          </div>

          {challenge.active && <Progress value={challenge.progress} label="Progreso del desafío de 60 días" />}

          <div className="grid-2" style={{ marginTop: 12 }}>
            <Field label="Fecha de inicio">
              <input
                type="date"
                value={data.challenge.startDate ?? ''}
                onChange={(e) =>
                  updateChallenge({ startDate: e.target.value || null })
                }
              />
            </Field>
            <Field label="Cantidad de días" hint="Por defecto 60.">
              <input
                type="number"
                min={1}
                max={365}
                value={data.challenge.totalDays}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 1) updateChallenge({ totalDays: Math.round(n) });
                }}
              />
            </Field>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Hábitos del desafío</label>
            {data.habits.length === 0 ? (
              <span className="field__hint">Creá hábitos en la sección Hábitos para asociarlos.</span>
            ) : (
              <div className="check-row">
                {data.habits.map((h) => {
                  const on = data.challenge.habitIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      className={`check-pill${on ? ' is-on' : ''}`}
                      onClick={() =>
                        updateChallenge({
                          habitIds: on
                            ? data.challenge.habitIds.filter((x) => x !== h.id)
                            : [...data.challenge.habitIds, h.id],
                        })
                      }
                      aria-pressed={on}
                    >
                      {h.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {challengeHabits.length > 0 && (
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Hábitos asociados: {challengeHabits.map((h) => `${h.name} (${frequencyLabel(h.frequency)})`).join(' · ')}
            </p>
          )}

          <p className="tiny muted" style={{ marginTop: 10 }}>
            El desafío muestra el día transcurrido según la fecha elegida. No garantiza resultados
            físicos: depende de tu constancia, alimentación, descanso y condiciones individuales.
          </p>

          {challenge.active && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginTop: 10 }}
              onClick={() => updateChallenge({ startDate: null })}
            >
              Reiniciar desafío
            </button>
          )}
        </div>
      </section>

      {/* Filtros */}
      <div className="section__title">Mis objetivos</div>
      <div className="row row--wrap" style={{ gap: 8, marginBottom: 12 }}>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as 'todas' | GoalCategory)}
          style={{ minHeight: 40, padding: '8px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
          aria-label="Filtrar por categoría"
        >
          <option value="todas">Todas las categorías</option>
          {GOAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'todos' | GoalStatus)}
          style={{ minHeight: 40, padding: '8px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          {GOAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon="target">
          No hay objetivos con estos filtros. Creá uno nuevo o cambiá los filtros.
        </EmptyState>
      ) : (
        byCategory.map(([cat, list]) => (
          <section key={cat} className="section">
            <div className="section__title" style={{ marginTop: 4 }}>
              {cat} · {list.length}
            </div>
            {list.map((g) => {
              const p = goalProgress(g);
              const steps = stepsDone(g);
              const overdue = isOverdue(g, today);
              return (
                <div key={g.id} className="card">
                  <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row row--wrap" style={{ gap: 6 }}>
                        <b style={{ wordBreak: 'break-word' }}>{g.title}</b>
                        <span
                          className={`chip ${
                            g.status === 'completado'
                              ? 'chip--success'
                              : g.status === 'en progreso'
                                ? 'chip--accent'
                                : ''
                          }`}
                        >
                          {g.status}
                        </span>
                        <span
                          className={`chip ${
                            g.priority === 'alta' ? 'chip--danger' : g.priority === 'media' ? 'chip--warning' : ''
                          }`}
                        >
                          {g.priority}
                        </span>
                        {overdue && <span className="chip chip--danger">Vencido</span>}
                      </div>
                      {g.description && <p className="small muted" style={{ marginTop: 6 }}>{g.description}</p>}
                      <div className="list-item__meta" style={{ marginTop: 6 }}>
                        {g.startDate && <span>Inicio: {formatISO(g.startDate)}</span>}
                        {g.dueDate && <span>· Límite: {formatISO(g.dueDate)}</span>}
                        {steps.total > 0 && <span>· Pasos: {steps.done}/{steps.total}</span>}
                        {g.budget !== null && <span>· Presupuesto: {formatARS(g.budget)}</span>}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <IconButton name="edit" label={`Editar ${g.title}`} bare onClick={() => openEdit(g)} />
                      <IconButton name="trash" label={`Eliminar ${g.title}`} bare onClick={() => setDeleting(g)} />
                    </div>
                  </div>

                  <div className="row row--between" style={{ marginTop: 10, marginBottom: 6 }}>
                    <span className="tiny muted">Progreso</span>
                    <b className="tiny">{p}%</b>
                  </div>
                  <Progress value={p} variant={p >= 100 ? 'success' : 'accent'} label="Progreso del objetivo" />

                  <div className="row row--wrap" style={{ marginTop: 10, gap: 8 }}>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() =>
                        updateGoal(g.id, { status: g.status === 'completado' ? 'pendiente' : 'completado' })
                      }
                    >
                      <Icon name="check" size={14} />
                      {g.status === 'completado' ? 'Reabrir' : 'Completar'}
                    </button>
                    {g.status !== 'completado' && (
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={() =>
                          updateGoal(g.id, { status: g.status === 'pendiente' ? 'en progreso' : 'pendiente' })
                        }
                      >
                        {g.status === 'pendiente' ? 'Poner en progreso' : 'Marcar pendiente'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}

      {/* Modal crear/editar */}
      {editing && (
        <Modal title={creating ? 'Nuevo objetivo' : 'Editar objetivo'} onClose={() => setEditing(null)}>
          <div className="form-grid">
            <Field label="Título" error={error && !editing.title.trim() ? error : ''}>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ej.: Terminar mi proyecto de página web"
                autoFocus
              />
            </Field>
            <Field label="Descripción">
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="¿De qué se trata?"
              />
            </Field>
            <div className="grid-2">
              <Field label="Categoría">
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as GoalCategory })}
                >
                  {GOAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridad">
                <select
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: e.target.value as GoalPriority })}
                >
                  <option value="baja">baja</option>
                  <option value="media">media</option>
                  <option value="alta">alta</option>
                </select>
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Fecha de inicio">
                <input
                  type="date"
                  value={editing.startDate ?? ''}
                  onChange={(e) => setEditing({ ...editing, startDate: e.target.value || null })}
                />
              </Field>
              <Field label="Fecha límite (opcional)">
                <input
                  type="date"
                  value={editing.dueDate ?? ''}
                  onChange={(e) => setEditing({ ...editing, dueDate: e.target.value || null })}
                />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Estado">
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as GoalStatus })}
                >
                  {GOAL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Presupuesto objetivo (ARS, opcional)">
                <input
                  inputMode="decimal"
                  value={budgetText}
                  onChange={(e) => setBudgetText(e.target.value)}
                  placeholder="Ej.: 1500000"
                />
              </Field>
            </div>

            {/* Pasos */}
            <div className="field">
              <label>Pasos o subtareas</label>
              {editing.steps.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {editing.steps.map((s) => (
                    <div key={s.id} className="list-item" style={{ padding: '9px 11px' }}>
                      <button
                        className={`check-btn${s.done ? ' is-on' : ''}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            steps: editing.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                          })
                        }
                        aria-label={s.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                      >
                        <Icon name="check" />
                      </button>
                      <div className="list-item__main">
                        <div className="list-item__title" style={{ fontSize: '0.85rem' }}>{s.title}</div>
                      </div>
                      <IconButton
                        name="close"
                        label={`Quitar ${s.title}`}
                        bare
                        onClick={() => setEditing({ ...editing, steps: editing.steps.filter((x) => x.id !== s.id) })}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="row" style={{ gap: 8 }}>
                <input
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Agregar un paso"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newStep.trim()) {
                      e.preventDefault();
                      const step: GoalStep = { id: uid(), title: newStep.trim(), done: false };
                      setEditing({ ...editing, steps: [...editing.steps, step] });
                      setNewStep('');
                    }
                  }}
                />
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    if (!newStep.trim()) return;
                    const step: GoalStep = { id: uid(), title: newStep.trim(), done: false };
                    setEditing({ ...editing, steps: [...editing.steps, step] });
                    setNewStep('');
                  }}
                >
                  Agregar
                </button>
              </div>
              <span className="field__hint">
                El progreso se calcula automáticamente desde los pasos cuando existen.
              </span>
            </div>

            {editing.steps.length === 0 && (
              <Field label="Progreso manual (%)" hint="Sin pasos, este valor lo definís vos.">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.progress}
                  onChange={(e) =>
                    setEditing({ ...editing, progress: clampPercent(Number(e.target.value)) })
                  }
                />
              </Field>
            )}

            <Field label="Notas">
              <textarea
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Ideas, enlaces, recordatorios..."
              />
            </Field>

            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn--primary" onClick={save}>Guardar</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar objetivo"
          danger
          confirmLabel="Eliminar"
          message={
            <>
              Vas a eliminar <b>{deleting.title}</b> y todos sus pasos. No se puede deshacer.
            </>
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteGoal(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
