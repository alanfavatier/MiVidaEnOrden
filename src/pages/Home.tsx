// Pantalla de Inicio: resumen del día.

import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Progress, Stat, EmptyState } from '../components/ui';
import { formatISO, longDate, todayISO, startOfWeek, weekDays } from '../lib/dates';
import { habitsSummary, isDoneOn, isScheduledOn } from '../lib/habits';
import { averageProgress, goalProgress, sortGoals, challengeInfo } from '../lib/goals';
import { summarize, transactionsOfMonth, currentMonthKey } from '../lib/finance';
import { formatARSCompacto } from '../lib/money';
import type { RouteProps } from './types';

export function HomePage({ onNavigate }: RouteProps) {
  const { data, toggleHabit, toggleTask } = useStore();
  const today = todayISO();
  const [showAllTasks, setShowAllTasks] = useState(false);

  const summary = habitsSummary(data.habits, today);

  const goalsProgress = averageProgress(data.goals);

  const priorityGoals = useMemo(
    () => sortGoals(data.goals.filter((g) => g.status !== 'completado')).slice(0, 3),
    [data.goals],
  );

  const month = currentMonthKey();
  const monthTx = transactionsOfMonth(data.transactions, month);
  const fin = summarize(monthTx);

  const upcoming = useMemo(() => {
    const pending = data.tasks
      .filter((t) => !t.done && t.date >= today)
      .sort((a, b) => (a.date === b.date ? (a.time ?? '99').localeCompare(b.time ?? '99') : a.date.localeCompare(b.date)));
    return showAllTasks ? pending.slice(0, 12) : pending.slice(0, 5);
  }, [data.tasks, today, showAllTasks]);

  const challenge = challengeInfo(data.challenge, today);
  const challengeHabitList = data.habits.filter((h) => data.challenge.habitIds.includes(h.id));

  // Resumen de la semana de hábitos (lunes a domingo).
  const week = weekDays(today);
  const weekDone = data.habits.reduce(
    (acc, h) => acc + week.filter((d) => isScheduledOn(h, d) && isDoneOn(h, d)).length,
    0,
  );
  const weekScheduled = data.habits.reduce(
    (acc, h) => acc + week.filter((d) => isScheduledOn(h, d)).length,
    0,
  );

  const name = data.preferences.name.trim();
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div>
      <section className="hero">
        <p className="tiny" style={{ opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {longDate(today)}
        </p>
        <h1 style={{ marginTop: 6 }}>
          {greeting}{name ? `, ${name}` : ''}
        </h1>
        <p>
          {summary.pending.length === 0 && summary.scheduled.length > 0
            ? '¡Completaste todos los hábitos de hoy! Podés seguir con tus tareas.'
            : summary.scheduled.length === 0
              ? 'No tenés hábitos programados para hoy. Aprovechá para planificar.'
              : `Hoy tenés ${summary.pending.length} ${summary.pending.length === 1 ? 'hábito pendiente' : 'hábitos pendientes'} de ${summary.scheduled.length} programados.`}
        </p>
        <div className="hero__stats">
          <div className="hero__stat">
            <b>
              {summary.done.length}/{summary.scheduled.length}
            </b>
            <span>Hábitos de hoy</span>
          </div>
          <div className="hero__stat">
            <b>{goalsProgress}%</b>
            <span>Progreso de objetivos</span>
          </div>
          <div className="hero__stat">
            <b>{upcoming.length}</b>
            <span>Próximas tareas</span>
          </div>
        </div>
      </section>

      {/* Hábitos de hoy */}
      <div className="section__title">Hábitos de hoy</div>
      <section className="section">
        {summary.scheduled.length === 0 ? (
          <EmptyState icon="check">
            No hay hábitos programados para hoy.
            <div style={{ marginTop: 10 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('habitos')}>
                Ir a Hábitos
              </button>
            </div>
          </EmptyState>
        ) : (
          summary.scheduled.map((h) => {
            const done = isDoneOn(h, today);
            return (
              <div key={h.id} className={`list-item${done ? ' is-done' : ''}`}>
                <button
                  className={`check-btn${done ? ' is-on' : ''}`}
                  onClick={() => toggleHabit(h.id, today)}
                  aria-label={done ? `Desmarcar ${h.name}` : `Marcar ${h.name} como completado`}
                >
                  <Icon name="check" />
                </button>
                <div className="list-item__main">
                  <div className="list-item__title">{h.name}</div>
                  <div className="list-item__meta">{h.category}</div>
                </div>
              </div>
            );
          })
        )}
        {summary.scheduled.length > 0 && (
          <div className="row row--between" style={{ marginTop: 10 }}>
            <span className="small muted">
              Semana: {weekDone}/{weekScheduled} cumplidos
            </span>
            <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('habitos')}>
              Ver calendario
            </button>
          </div>
        )}
      </section>

      {/* Próximas tareas */}
      <div className="section__title">Próximas tareas</div>
      <section className="section">
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar">
            No tenés tareas próximas.
            <div style={{ marginTop: 10 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('agenda')}>
                Ir a Agenda
              </button>
            </div>
          </EmptyState>
        ) : (
          upcoming.map((t) => (
            <div key={t.id} className="list-item">
              <button
                className="check-btn"
                onClick={() => toggleTask(t.id)}
                aria-label={`Marcar "${t.title}" como completada`}
              >
                <Icon name="check" />
              </button>
              <div className="list-item__main">
                <div className="list-item__title">{t.title}</div>
                <div className="list-item__meta">
                  <span className="chip chip--accent">{t.category}</span>
                  <span>{formatISO(t.date)}</span>
                  {t.time ? <span>· {t.time} h</span> : null}
                  {t.date > today ? <span>· En {daysUntil(t.date, today)} d</span> : null}
                </div>
              </div>
            </div>
          ))
        )}
        {data.tasks.filter((t) => !t.done && t.date >= today).length > 5 && (
          <button className="btn btn--ghost btn--sm btn--block" onClick={() => setShowAllTasks((v) => !v)}>
            {showAllTasks ? 'Ver menos' : 'Ver más tareas'}
          </button>
        )}
      </section>

      {/* Objetivos */}
      <div className="section__title">Objetivos prioritarios</div>
      <section className="section">
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Progreso general</div>
              <div className="card__subtitle">
                {data.goals.length} objetivos · {data.goals.filter((g) => g.status === 'completado').length} completados
              </div>
            </div>
            <b>{goalsProgress}%</b>
          </div>
          <Progress value={goalsProgress} label="Progreso general de tus objetivos" />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn--ghost btn--sm btn--block" onClick={() => onNavigate('objetivos')}>
              Gestionar objetivos
            </button>
          </div>
        </div>

        {priorityGoals.map((g) => (
          <div key={g.id} className="list-item">
            <div className="list-item__main">
              <div className="list-item__title">{g.title}</div>
              <div className="list-item__meta">
                <span className="chip">{g.category}</span>
                <span className={`chip ${g.priority === 'alta' ? 'chip--danger' : g.priority === 'media' ? 'chip--warning' : ''}`}>
                  Prioridad {g.priority}
                </span>
                <span>{goalProgress(g)}%</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Progress value={goalProgress(g)} label={`Progreso de ${g.title}`} />
              </div>
            </div>
          </div>
        ))}
        {priorityGoals.length === 0 && (
          <EmptyState icon="target">Todavía no tenés objetivos cargados.</EmptyState>
        )}
      </section>

      {/* Finanzas del mes */}
      <div className="section__title">Resumen del mes</div>
      <section className="section">
        <div className="grid-2">
          <Stat label="Ingresos" value={formatARSCompacto(fin.income)} tone="success" hint={`${fin.incomeCount} movimientos`} />
          <Stat label="Gastos" value={formatARSCompacto(fin.expense)} tone="danger" hint={`${fin.expenseCount} movimientos`} />
        </div>
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row row--between">
            <div>
              <div className="stat__label">Balance del mes</div>
              <div
                className="stat__value"
                style={{ color: fin.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}
              >
                {formatARSCompacto(fin.balance)}
              </div>
              <div className="stat__hint">Transferencias entre cuentas propias no se cuentan.</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('finanzas')}>
              Ver finanzas
            </button>
          </div>
        </div>
      </section>

      {/* Desafío de 60 días */}
      <div className="section__title">Desafío físico de 60 días</div>
      <section className="section">
        <div className="card">
          {challenge.active ? (
            <>
              <div className="card__header">
                <div>
                  <div className="card__title">
                    Día {challenge.currentDay} de {data.challenge.totalDays}
                  </div>
                  <div className="card__subtitle">
                    Iniciado el {formatISO(challenge.startDate)} · quedan {challenge.remaining} días
                  </div>
                </div>
                <span className="chip chip--accent">
                  <Icon name="flame" size={13} /> {challenge.progress}%
                </span>
              </div>
              <Progress value={challenge.progress} label="Progreso del desafío de 60 días" />
              <p className="tiny muted" style={{ marginTop: 10 }}>
                Este contador refleja los días transcurridos desde la fecha que elegiste. No garantiza
                resultados físicos: el progreso real depende de tu constancia y de factores individuales.
              </p>
              {challengeHabitList.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="stat__label" style={{ marginBottom: 8 }}>
                    Hábitos asociados
                  </div>
                  {challengeHabitList.map((h) => {
                    const done = isDoneOn(h, today) && isScheduledOn(h, today);
                    return (
                      <div key={h.id} className={`list-item${done ? ' is-done' : ''}`}>
                        <button
                          className={`check-btn${done ? ' is-on' : ''}`}
                          onClick={() => isScheduledOn(h, today) && toggleHabit(h.id, today)}
                          disabled={!isScheduledOn(h, today)}
                          aria-label={`Marcar ${h.name}`}
                        >
                          <Icon name="check" />
                        </button>
                        <div className="list-item__main">
                          <div className="list-item__title">{h.name}</div>
                          {!isScheduledOn(h, today) && (
                            <div className="list-item__meta">No programado hoy</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('objetivos')}>
                  Configurar desafío
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="card__title">Iniciá tu desafío de 60 días</div>
              <p className="small muted" style={{ marginTop: 6 }}>
                Elegí la fecha de inicio y los hábitos que querés acompañar. La app muestra en qué día
                vas; no promete resultados garantizados.
              </p>
              <button
                className="btn btn--primary btn--sm"
                style={{ marginTop: 12 }}
                onClick={() => onNavigate('objetivos')}
              >
                Configurar desafío
              </button>
            </>
          )}
        </div>
      </section>

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 20 }}>
        Semana del {formatISO(startOfWeek(today))} · {data.habits.length} hábitos en seguimiento
      </p>
    </div>
  );
}

function daysUntil(iso: string, from: string): number {
  return Math.round((new Date(iso).getTime() - new Date(from).getTime()) / 86400000);
}
