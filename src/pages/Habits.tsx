// Página de Hábitos y disciplina: CRUD, calendario visual, rachas y porcentajes.

import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Modal, ConfirmDialog, Progress, EmptyState, Field, IconButton } from '../components/ui';
import {
  formatISO,
  fromISO,
  daysOfMonth,
  monthLabel,
  addMonthsKey,
  monthKey,
  todayISO,
  weekdayLong,
  weekdayShort,
  isValidISO,
} from '../lib/dates';
import {
  currentStreak,
  isDoneOn,
  isScheduledOn,
  monthMatrix,
  overallPercent,
  weeklyPercent,
} from '../lib/habits';
import type { Habit, HabitFrequency } from '../types';
import { SEED_HABIT_CATEGORY_OPTIONS } from '../lib/seed';

interface FormState {
  name: string;
  category: string;
  startDate: string;
  frequency: HabitFrequency;
}

const emptyForm = (): FormState => ({
  name: '',
  category: SEED_HABIT_CATEGORY_OPTIONS[0],
  startDate: todayISO(),
  frequency: { type: 'daily' },
});

export function HabitsPage() {
  const { data, addHabit, updateHabit, deleteHabit, toggleHabit } = useStore();
  const today = todayISO();

  const [tab, setTab] = useState<'lista' | 'calendario'>('lista');
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);
  const [error, setError] = useState('');

  const [calMonth, setCalMonth] = useState(() => monthKey(today));
  const [selectedDay, setSelectedDay] = useState(today);

  const matrix = useMemo(() => monthMatrix(data.habits, daysOfMonth(calMonth)), [data.habits, calMonth]);

  function submitCreate() {
    if (!creating) return;
    const name = creating.name.trim();
    if (!name) return setError('Ingresá un nombre para el hábito.');
    if (!isValidISO(creating.startDate)) return setError('La fecha de inicio no es válida.');
    const freq = creating.frequency;
    if (freq.type === 'days' && freq.days.length === 0)
      return setError('Elegí al menos un día de la semana.');
    if (freq.type === 'timesPerWeek' && (freq.times < 1 || freq.times > 7))
      return setError('La cantidad de veces por semana debe estar entre 1 y 7.');

    addHabit({
      name,
      category: creating.category,
      startDate: creating.startDate,
      frequency: freq,
    });
    setCreating(null);
    setError('');
  }

  function submitEdit() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return setError('Ingresá un nombre para el hábito.');
    if (!isValidISO(editing.startDate)) return setError('La fecha de inicio no es válida.');
    if (editing.frequency.type === 'days' && editing.frequency.days.length === 0)
      return setError('Elegí al menos un día de la semana.');
    updateHabit(editing.id, { name, category: editing.category, startDate: editing.startDate, frequency: editing.frequency });
    setEditing(null);
    setError('');
  }

  const habitsSorted = [...data.habits].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div>
      <div className="page-header">
        <div className="row row--between">
          <div>
            <h1>Hábitos</h1>
            <p>Seguimiento diario con historial propio. Nada se marca solo.</p>
          </div>
          <button className="btn btn--primary" onClick={() => { setCreating(emptyForm()); setError(''); }}>
            <Icon name="plus" /> Nuevo
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button className={`tabs__btn${tab === 'lista' ? ' is-active' : ''}`} onClick={() => setTab('lista')}>
          Mis hábitos
        </button>
        <button
          className={`tabs__btn${tab === 'calendario' ? ' is-active' : ''}`}
          onClick={() => setTab('calendario')}
        >
          Calendario
        </button>
      </div>

      {tab === 'lista' && (
        <div className="section">
          {habitsSorted.length === 0 ? (
            <EmptyState icon="check">
              No tenés hábitos cargados. Creá el primero para empezar a seguir tu constancia.
            </EmptyState>
          ) : (
            habitsSorted.map((h) => {
              const scheduled = isScheduledOn(h, today);
              const done = isDoneOn(h, today);
              const streak = currentStreak(h, today);
              const week = weeklyPercent(h, today);
              const total = overallPercent(h, today);
              const freqLabel = frequencyLabel(h.frequency);
              return (
                <div key={h.id} className="card">
                  <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row row--wrap" style={{ gap: 6 }}>
                        <b style={{ wordBreak: 'break-word' }}>{h.name}</b>
                        <span className="chip">{h.category}</span>
                      </div>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {freqLabel} · Desde {formatISO(h.startDate)}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <IconButton name="edit" label={`Editar ${h.name}`} bare onClick={() => { setEditing({ ...h }); setError(''); }} />
                      <IconButton name="trash" label={`Eliminar ${h.name}`} bare onClick={() => setDeleting(h)} />
                    </div>
                  </div>

                  <div className="grid-3" style={{ marginTop: 12 }}>
                    <div className="stat" style={{ padding: '9px 11px' }}>
                      <div className="stat__label">Semana</div>
                      <div className="stat__value" style={{ fontSize: '1rem' }}>{week}%</div>
                    </div>
                    <div className="stat" style={{ padding: '9px 11px' }}>
                      <div className="stat__label">Histórico</div>
                      <div className="stat__value" style={{ fontSize: '1rem' }}>{total}%</div>
                    </div>
                    <div className="stat" style={{ padding: '9px 11px' }}>
                      <div className="stat__label">Racha</div>
                      <div className="stat__value" style={{ fontSize: '1rem' }}>
                        {streak > 0 ? `${streak} d` : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Progress value={week} variant={week >= 80 ? 'success' : week >= 40 ? 'warning' : 'accent'} label="Progreso semanal del hábito" />
                  </div>

                  <div className="row row--between" style={{ marginTop: 12 }}>
                    <span className="small muted">
                      {scheduled
                        ? done
                          ? 'Hoy: completado ✓'
                          : 'Hoy: pendiente'
                        : 'Hoy: no programado'}
                    </span>
                    <button
                      className={`btn btn--sm ${done ? 'btn--success' : 'btn--ghost'}`}
                      disabled={!scheduled}
                      onClick={() => toggleHabit(h.id, today)}
                    >
                      <Icon name="check" size={15} />
                      {done ? 'Completado' : 'Marcar hoy'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'calendario' && (
        <div className="section">
          <div className="card">
            <div className="card__header">
              <button className="icon-btn" onClick={() => { setCalMonth(addMonthsKey(calMonth, -1)); }} aria-label="Mes anterior">
                <Icon name="chevron-left" />
              </button>
              <div className="card__title">{monthLabel(calMonth)}</div>
              <button className="icon-btn" onClick={() => { setCalMonth(addMonthsKey(calMonth, 1)); }} aria-label="Mes siguiente">
                <Icon name="chevron-right" />
              </button>
            </div>

            {data.habits.length === 0 ? (
              <EmptyState icon="calendar">Creá hábitos para ver tu calendario de cumplimiento.</EmptyState>
            ) : (
              <>
                <div className="calendar" aria-hidden>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                    <div key={d} className="calendar__head">{d}</div>
                  ))}
                  {(() => {
                    const first = `${calMonth}-01`;
                    const dow = fromISO(first).getDay(); // 0 dom
                    const offset = dow === 0 ? 6 : dow - 1;
                    const cells = [];
                    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} className="calendar__day is-empty" />);
                    for (const cell of matrix) {
                      const isToday = cell.date === today;
                      const isSelected = cell.date === selectedDay;
                      const cls =
                        cell.total > 0 && cell.done === cell.total
                          ? ' calendar__day--full'
                          : cell.done > 0
                            ? ' calendar__day--partial'
                            : '';
                      cells.push(
                        <button
                          key={cell.date}
                          className={`calendar__day${cls}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedDay(cell.date)}
                          aria-label={`${formatISO(cell.date)}: ${cell.done} de ${cell.total} cumplidos`}
                        >
                          {Number(cell.date.slice(8))}
                          {cell.total > 0 && <span className="calendar__dot" />}
                        </button>,
                      );
                    }
                    return cells;
                  })()}
                </div>

                <div className="row row--wrap" style={{ marginTop: 12, gap: 12 }}>
                  <span className="tiny muted"><span className="calendar__dot" style={{ background: 'var(--success)', display: 'inline-block' }} /> Todo cumplido</span>
                  <span className="tiny muted"><span className="calendar__dot" style={{ background: 'var(--warning)', display: 'inline-block' }} /> Parcial</span>
                  <span className="tiny muted">Sin marcar: pendiente o no programado</span>
                </div>

                <div className="divider" />
                <div className="card__title" style={{ marginBottom: 10 }}>
                  {formatISO(selectedDay)}
                  {selectedDay === today ? ' (hoy)' : ''}
                </div>
                {(() => {
                  const scheduled = data.habits.filter((h) => isScheduledOn(h, selectedDay));
                  if (scheduled.length === 0) return <p className="small muted">No hay hábitos programados ese día.</p>;
                  return scheduled.map((h) => {
                    const done = isDoneOn(h, selectedDay);
                    return (
                      <div key={h.id} className={`list-item${done ? ' is-done' : ''}`}>
                        <button
                          className={`check-btn${done ? ' is-on' : ''}`}
                          onClick={() => toggleHabit(h.id, selectedDay)}
                          aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${h.name} el ${formatISO(selectedDay)}`}
                        >
                          <Icon name="check" />
                        </button>
                        <div className="list-item__main">
                          <div className="list-item__title">{h.name}</div>
                          <div className="list-item__meta">{h.category}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <p className="tiny muted" style={{ marginTop: 10 }}>
                  Podés corregir cualquier día; las marcas nunca se generan solas.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {creating && (
        <Modal title="Nuevo hábito" onClose={() => { setCreating(null); setError(''); }}>
          <div className="form-grid">
            <Field label="Nombre" error={error && !creating.name.trim() ? error : ''}>
              <input
                value={creating.name}
                onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                placeholder="Ej.: Ir al gimnasio"
                autoFocus
              />
            </Field>
            <Field label="Categoría">
              <select
                value={creating.category}
                onChange={(e) => setCreating({ ...creating, category: e.target.value })}
              >
                {SEED_HABIT_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de inicio">
              <input
                type="date"
                value={creating.startDate}
                onChange={(e) => setCreating({ ...creating, startDate: e.target.value })}
              />
            </Field>
            <FrequencyEditor
              value={creating.frequency}
              onChange={(frequency) => setCreating({ ...creating, frequency })}
            />
            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => { setCreating(null); setError(''); }}>Cancelar</button>
            <button className="btn btn--primary" onClick={submitCreate}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal de edición */}
      {editing && (
        <Modal title="Editar hábito" onClose={() => { setEditing(null); setError(''); }}>
          <div className="form-grid">
            <Field label="Nombre">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Categoría">
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {SEED_HABIT_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de inicio" hint="Cambiarla no borra el historial.">
              <input
                type="date"
                value={editing.startDate}
                onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
              />
            </Field>
            <FrequencyEditor
              value={editing.frequency}
              onChange={(frequency) => setEditing({ ...editing, frequency })}
            />
            <div className="divider" />
            <div>
              <div className="stat__label" style={{ marginBottom: 8 }}>Historial ({editing.history.length} días marcados)</div>
              <div className="row row--wrap" style={{ gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                {editing.history.length === 0 && <span className="small muted">Sin días marcados todavía.</span>}
                {[...editing.history].reverse().slice(0, 40).map((d) => (
                  <span key={d} className="chip chip--success">{formatISO(d)}</span>
                ))}
              </div>
              <button
                className="btn btn--ghost btn--sm"
                style={{ marginTop: 10 }}
                onClick={() => setEditing({ ...editing, history: [] })}
              >
                Borrar historial
              </button>
            </div>
            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => { setEditing(null); setError(''); }}>Cancelar</button>
            <button className="btn btn--primary" onClick={submitEdit}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* Confirmación de borrado */}
      {deleting && (
        <ConfirmDialog
          title="Eliminar hábito"
          danger
          confirmLabel="Eliminar"
          message={
            <>
              Vas a eliminar <b>{deleting.name}</b> junto con todo su historial de cumplimiento. Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteHabit(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function FrequencyEditor({
  value,
  onChange,
}: {
  value: HabitFrequency;
  onChange: (frequency: HabitFrequency) => void;
}) {
  const type = value.type;
  const days = type === 'days' ? value.days : [];
  const times = type === 'timesPerWeek' ? value.times : 3;

  const setType = (t: HabitFrequency['type']) => {
    if (t === 'daily') onChange({ type: 'daily' });
    else if (t === 'days') onChange({ type: 'days', days: days.length ? days : [1] });
    else onChange({ type: 'timesPerWeek', times: times || 3 });
  };

  return (
    <div className="field">
      <label>Frecuencia</label>
      <div className="check-row" style={{ marginBottom: 4 }}>
        <button type="button" className={`check-pill${type === 'daily' ? ' is-on' : ''}`} onClick={() => setType('daily')}>
          Diario
        </button>
        <button type="button" className={`check-pill${type === 'days' ? ' is-on' : ''}`} onClick={() => setType('days')}>
          Días específicos
        </button>
        <button type="button" className={`check-pill${type === 'timesPerWeek' ? ' is-on' : ''}`} onClick={() => setType('timesPerWeek')}>
          Veces por semana
        </button>
      </div>

      {type === 'days' && (
        <div className="check-row" style={{ marginTop: 8 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              className={`check-pill${days.includes(d) ? ' is-on' : ''}`}
              onClick={() =>
                onChange({
                  type: 'days',
                  days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b),
                })
              }
              aria-pressed={days.includes(d)}
            >
              {weekdayShort(d)}
            </button>
          ))}
        </div>
      )}

      {type === 'timesPerWeek' && (
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="number"
            min={1}
            max={7}
            value={times}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange({ type: 'timesPerWeek', times: n });
            }}
            style={{ width: 90, minHeight: 44, padding: '10px 12px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
          />
          <span className="small muted">veces por semana (se reparte como quieras)</span>
        </div>
      )}

      <span className="field__hint">
        {type === 'daily'
          ? 'Se programa todos los días desde la fecha de inicio.'
          : type === 'days'
            ? `Días: ${days.length ? days.map(weekdayLong).join(', ') : 'ninguno'}.`
            : 'Completalo la cantidad de veces que indiques cada semana.'}
      </span>
    </div>
  );
}

export function frequencyLabel(f: HabitFrequency): string {
  if (f.type === 'daily') return 'Diario';
  if (f.type === 'days') return f.days.map(weekdayLong).join(', ') || 'Sin días';
  return `${f.times} veces por semana`;
}
