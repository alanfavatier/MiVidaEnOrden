// Página Agenda: tareas diarias/semanales y rutina semanal reutilizable.

import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Modal, ConfirmDialog, EmptyState, Field, IconButton } from '../components/ui';
import {
  addDays,
  formatISO,
  fromISO,
  isValidISO,
  longDate,
  startOfWeek,
  todayISO,
  weekDays,
  weekdayLong,
} from '../lib/dates';
import type { RoutineEntry, Task, TaskCategory } from '../types';

export const TASK_CATEGORIES: TaskCategory[] = [
  'Gimnasio',
  'Trabajo',
  'Reparto de agua',
  'Estudio',
  'Programación',
  'Inglés',
  'Recreación',
  'Personal',
];

interface TaskForm {
  title: string;
  date: string;
  time: string;
  duration: string;
  category: TaskCategory;
  notes: string;
}

const emptyTaskForm = (date: string): TaskForm => ({
  title: '',
  date,
  time: '',
  duration: '',
  category: 'Personal',
  notes: '',
});

interface RoutineForm {
  id: string | null;
  weekday: number;
  title: string;
  time: string;
  duration: string;
  category: TaskCategory;
}

export function AgendaPage() {
  const {
    data,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    rescheduleTask,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    generateTasksFromRoutine,
  } = useStore();

  const today = todayISO();
  const [view, setView] = useState<'dia' | 'semana' | 'rutina'>('dia');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [rescheduling, setRescheduling] = useState<Task | null>(null);
  const [newDate, setNewDate] = useState('');
  const [routineForm, setRoutineForm] = useState<RoutineForm | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState<RoutineEntry | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const dayTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.date === selectedDate)
        .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')),
    [data.tasks, selectedDate],
  );

  const week = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const d of week) map.set(d, []);
    for (const t of data.tasks) {
      if (map.has(t.date)) map.get(t.date)!.push(t);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
    return map;
  }, [data.tasks, week]);

  function saveTask() {
    if (!taskForm) return;
    const title = taskForm.title.trim();
    if (!title) return setError('Ingresá un título para la tarea.');
    if (!isValidISO(taskForm.date)) return setError('La fecha no es válida.');
    let duration: number | null = null;
    if (taskForm.duration.trim()) {
      const n = Number(taskForm.duration);
      if (!Number.isFinite(n) || n <= 0) return setError('La duración debe ser una cantidad de minutos válida.');
      duration = Math.round(n);
    }
    const payload = {
      title,
      date: taskForm.date,
      time: taskForm.time || null,
      duration,
      category: taskForm.category,
      notes: taskForm.notes.trim(),
    };
    if (editingTask) updateTask(editingTask.id, payload);
    else addTask(payload);
    setTaskForm(null);
    setEditingTask(null);
    setError('');
  }

  function openEditTask(t: Task) {
    setEditingTask(t);
    setTaskForm({
      title: t.title,
      date: t.date,
      time: t.time ?? '',
      duration: t.duration !== null ? String(t.duration) : '',
      category: t.category,
      notes: t.notes,
    });
    setError('');
  }

  function saveRoutine() {
    if (!routineForm) return;
    const title = routineForm.title.trim();
    if (!title) return setError('Ingresá un título para la entrada de la rutina.');
    let duration: number | null = null;
    if (routineForm.duration.trim()) {
      const n = Number(routineForm.duration);
      if (!Number.isFinite(n) || n <= 0) return setError('La duración debe ser una cantidad de minutos válida.');
      duration = Math.round(n);
    }
    const payload = {
      weekday: routineForm.weekday,
      title,
      time: routineForm.time || null,
      duration,
      category: routineForm.category,
    };
    if (routineForm.id) updateRoutine(routineForm.id, payload);
    else addRoutine(payload);
    setRoutineForm(null);
    setError('');
  }

  const routinesByDay = useMemo(() => {
    const map = new Map<number, RoutineEntry[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const r of [...data.routines].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))) {
      map.get(r.weekday)?.push(r);
    }
    return map;
  }, [data.routines]);

  return (
    <div>
      <div className="page-header">
        <div className="row row--between">
          <div>
            <h1>Agenda</h1>
            <p>Planificá tu día, tu semana y tu rutina repetible.</p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => {
              setTaskForm(emptyTaskForm(view === 'dia' ? selectedDate : today));
              setEditingTask(null);
              setError('');
            }}
          >
            <Icon name="plus" /> Tarea
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button className={`tabs__btn${view === 'dia' ? ' is-active' : ''}`} onClick={() => setView('dia')}>
          Día
        </button>
        <button className={`tabs__btn${view === 'semana' ? ' is-active' : ''}`} onClick={() => setView('semana')}>
          Semana
        </button>
        <button className={`tabs__btn${view === 'rutina' ? ' is-active' : ''}`} onClick={() => setView('rutina')}>
          Rutina semanal
        </button>
      </div>

      {view === 'dia' && (
        <section className="section">
          <div className="card">
            <div className="card__header">
              <button className="icon-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Día anterior">
                <Icon name="chevron-left" />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div className="card__title">{selectedDate === today ? 'Hoy' : weekdayLong(fromISO(selectedDate).getDay())}</div>
                <div className="card__subtitle">{longDate(selectedDate)}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Día siguiente">
                <Icon name="chevron-right" />
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelectedDate(today)}>
                Ir a hoy
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                style={{ minHeight: 36, padding: '7px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
                aria-label="Elegir fecha"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {dayTasks.length === 0 ? (
              <EmptyState icon="calendar">No hay tareas para este día.</EmptyState>
            ) : (
              dayTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => toggleTask(t.id)}
                  onEdit={() => openEditTask(t)}
                  onDelete={() => setDeletingTask(t)}
                  onReschedule={() => {
                    setRescheduling(t);
                    setNewDate(addDays(t.date, 1));
                  }}
                />
              ))
            )}
          </div>
        </section>
      )}

      {view === 'semana' && (
        <section className="section">
          <div className="card">
            <div className="card__header">
              <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
                <Icon name="chevron-left" />
              </button>
              <div className="card__title">
                {formatISO(weekStart)} — {formatISO(addDays(weekStart, 6))}
              </div>
              <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semana siguiente">
                <Icon name="chevron-right" />
              </button>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setWeekStart(startOfWeek(today))}>
                Esta semana
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const n = generateTasksFromRoutine(weekStart);
                  setToast(n > 0 ? `Se crearon ${n} tareas desde la rutina.` : 'La semana ya tiene las tareas de la rutina.');
                  setTimeout(() => setToast(''), 3500);
                }}
              >
                <Icon name="repeat" size={15} /> Generar desde rutina
              </button>
            </div>
          </div>

          {week.map((d) => {
            const list = weekTasks.get(d) ?? [];
            const pending = list.filter((t) => !t.done).length;
            return (
              <div key={d} className="card">
                <div className="card__header" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="card__title">
                      {weekdayLong(fromISO(d).getDay())} {formatISO(d)}
                      {d === today ? ' · hoy' : ''}
                    </div>
                    <div className="card__subtitle">
                      {list.length === 0 ? 'Sin tareas' : `${list.length} tareas · ${pending} pendientes`}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Agregar tarea el ${formatISO(d)}`}
                    onClick={() => {
                      setTaskForm(emptyTaskForm(d));
                      setEditingTask(null);
                      setError('');
                    }}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    compact
                    onToggle={() => toggleTask(t.id)}
                    onEdit={() => openEditTask(t)}
                    onDelete={() => setDeletingTask(t)}
                    onReschedule={() => {
                      setRescheduling(t);
                      setNewDate(addDays(t.date, 1));
                    }}
                  />
                ))}
              </div>
            );
          })}
        </section>
      )}

      {view === 'rutina' && (
        <section className="section">
          <div className="card">
            <div className="card__title">Mi rutina semanal</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Creá entradas reutilizables sin horarios fijos: la hora es opcional. Desde la vista
              Semana podés generar las tareas de la semana con un click.
            </p>
            <button
              className="btn btn--primary btn--sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                setRoutineForm({ id: null, weekday: 1, title: '', time: '', duration: '', category: 'Personal' });
                setError('');
              }}
            >
              <Icon name="plus" size={15} /> Agregar a la rutina
            </button>
          </div>

          {data.routines.length === 0 ? (
            <EmptyState icon="repeat">Todavía no cargaste entradas en tu rutina semanal.</EmptyState>
          ) : (
            [1, 2, 3, 4, 5, 6, 0].map((wd) => {
              const list = routinesByDay.get(wd) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={wd} className="card">
                  <div className="card__header" style={{ marginBottom: 8 }}>
                    <div className="card__title">{weekdayLong(wd)}</div>
                    <button
                      className="icon-btn"
                      aria-label={`Agregar el ${weekdayLong(wd)}`}
                      onClick={() => {
                        setRoutineForm({ id: null, weekday: wd, title: '', time: '', duration: '', category: 'Personal' });
                        setError('');
                      }}
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  {list.map((r) => (
                    <div key={r.id} className="list-item">
                      <div className="list-item__main">
                        <div className="list-item__title">{r.title}</div>
                        <div className="list-item__meta">
                          <span className="chip chip--accent">{r.category}</span>
                          {r.time ? <span>· {r.time} h</span> : <span>· sin horario</span>}
                          {r.duration ? <span>· {r.duration} min</span> : null}
                        </div>
                      </div>
                      <IconButton
                        name="edit"
                        label={`Editar ${r.title}`}
                        bare
                        onClick={() => {
                          setRoutineForm({
                            id: r.id,
                            weekday: r.weekday,
                            title: r.title,
                            time: r.time ?? '',
                            duration: r.duration !== null ? String(r.duration) : '',
                            category: r.category,
                          });
                          setError('');
                        }}
                      />
                      <IconButton name="trash" label={`Eliminar ${r.title}`} bare onClick={() => setDeletingRoutine(r)} />
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Modal de tarea */}
      {taskForm && (
        <Modal
          title={editingTask ? 'Editar tarea' : 'Nueva tarea'}
          onClose={() => {
            setTaskForm(null);
            setEditingTask(null);
          }}
        >
          <div className="form-grid">
            <Field label="Título" error={error && !taskForm.title.trim() ? error : ''}>
              <input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Ej.: Entrenamiento de piernas"
                autoFocus
              />
            </Field>
            <div className="grid-2">
              <Field label="Fecha">
                <input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                />
              </Field>
              <Field label="Hora (opcional)">
                <input
                  type="time"
                  value={taskForm.time}
                  onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Duración (minutos, opcional)">
                <input
                  type="number"
                  min={1}
                  value={taskForm.duration}
                  onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                  placeholder="Ej.: 60"
                />
              </Field>
              <Field label="Categoría">
                <select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value as TaskCategory })}
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notas (opcional)">
              <textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              />
            </Field>
            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button
              className="btn btn--ghost"
              onClick={() => {
                setTaskForm(null);
                setEditingTask(null);
              }}
            >
              Cancelar
            </button>
            <button className="btn btn--primary" onClick={saveTask}>
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Reprogramar */}
      {rescheduling && (
        <Modal title="Reprogramar tarea" onClose={() => setRescheduling(null)}>
          <div className="form-grid">
            <p className="small muted">
              Tarea: <b>{rescheduling.title}</b> · fecha actual {formatISO(rescheduling.date)}
            </p>
            <Field label="Nueva fecha">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </Field>
            <div className="row row--wrap" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setNewDate(addDays(rescheduling.date, 1))}>
                Mañana
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setNewDate(addDays(rescheduling.date, 7))}>
                En una semana
              </button>
            </div>
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setRescheduling(null)}>Cancelar</button>
            <button
              className="btn btn--primary"
              onClick={() => {
                if (!isValidISO(newDate)) {
                  setError('Elegí una fecha válida.');
                  return;
                }
                rescheduleTask(rescheduling.id, newDate);
                setRescheduling(null);
              }}
            >
              Reprogramar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal rutina */}
      {routineForm && (
        <Modal title={routineForm.id ? 'Editar entrada de rutina' : 'Nueva entrada de rutina'} onClose={() => setRoutineForm(null)}>
          <div className="form-grid">
            <Field label="Título" error={error && !routineForm.title.trim() ? error : ''}>
              <input
                value={routineForm.title}
                onChange={(e) => setRoutineForm({ ...routineForm, title: e.target.value })}
                placeholder="Ej.: Estudiar programación"
                autoFocus
              />
            </Field>
            <Field label="Día de la semana">
              <select
                value={routineForm.weekday}
                onChange={(e) => setRoutineForm({ ...routineForm, weekday: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>{weekdayLong(d)}</option>
                ))}
              </select>
            </Field>
            <div className="grid-2">
              <Field label="Hora (opcional)" hint="Podés dejarlo sin horario.">
                <input
                  type="time"
                  value={routineForm.time}
                  onChange={(e) => setRoutineForm({ ...routineForm, time: e.target.value })}
                />
              </Field>
              <Field label="Duración (min, opcional)">
                <input
                  type="number"
                  min={1}
                  value={routineForm.duration}
                  onChange={(e) => setRoutineForm({ ...routineForm, duration: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Categoría">
              <select
                value={routineForm.category}
                onChange={(e) => setRoutineForm({ ...routineForm, category: e.target.value as TaskCategory })}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setRoutineForm(null)}>Cancelar</button>
            <button className="btn btn--primary" onClick={saveRoutine}>Guardar</button>
          </div>
        </Modal>
      )}

      {deletingTask && (
        <ConfirmDialog
          title="Eliminar tarea"
          danger
          confirmLabel="Eliminar"
          message={<>Vas a eliminar <b>{deletingTask.title}</b>. Esta acción no se puede deshacer.</>}
          onCancel={() => setDeletingTask(null)}
          onConfirm={() => {
            deleteTask(deletingTask.id);
            setDeletingTask(null);
          }}
        />
      )}

      {deletingRoutine && (
        <ConfirmDialog
          title="Eliminar de la rutina"
          danger
          confirmLabel="Eliminar"
          message={
            <>
              Se quitará <b>{deletingRoutine.title}</b> de tu rutina semanal. Las tareas ya generadas
              no se borran.
            </>
          }
          onCancel={() => setDeletingRoutine(null)}
          onConfirm={() => {
            deleteRoutine(deletingRoutine.id);
            setDeletingRoutine(null);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  onReschedule,
  compact = false,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReschedule: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`list-item${task.done ? ' is-done' : ''}`}>
      <button
        className={`check-btn${task.done ? ' is-on' : ''}`}
        onClick={onToggle}
        aria-label={task.done ? `Reabrir ${task.title}` : `Completar ${task.title}`}
      >
        <Icon name="check" />
      </button>
      <div className="list-item__main">
        <div className="list-item__title">{task.title}</div>
        <div className="list-item__meta">
          <span className="chip chip--accent">{task.category}</span>
          {!compact && <span>{formatISO(task.date)}</span>}
          {task.time && <span>· {task.time} h</span>}
          {task.duration ? <span>· {task.duration} min</span> : null}
        </div>
      </div>
      <div className="row" style={{ gap: 2 }}>
        {!task.done && (
          <IconButton name="repeat" label={`Reprogramar ${task.title}`} bare onClick={onReschedule} />
        )}
        <IconButton name="edit" label={`Editar ${task.title}`} bare onClick={onEdit} />
        <IconButton name="trash" label={`Eliminar ${task.title}`} bare onClick={onDelete} />
      </div>
    </div>
  );
}
