// Página de Finanzas personales: ingresos, gastos, ahorros e historial.

import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Modal, ConfirmDialog, Stat, EmptyState, Field, IconButton, Progress } from '../components/ui';
import { formatISO, isValidISO, monthKey, monthLabel, todayISO } from '../lib/dates';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  accumulatedBalance,
  compareWithPreviousMonth,
  currentMonthKey,
  filterTransactions,
  monthsWithHistory,
  savingsStatus,
  summarize,
  transactionsOfMonth,
  usedCategories,
} from '../lib/finance';
import { formatARS, formatARSCompacto, parseAmount } from '../lib/money';
import type { SavingsGoal, Transaction, TransactionType } from '../types';

interface TxForm {
  type: TransactionType;
  description: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
  transfer: boolean;
}

export function FinancesPage() {
  const { data, addTransaction, updateTransaction, deleteTransaction, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } =
    useStore();
  const today = todayISO();

  const [tab, setTab] = useState<'resumen' | 'historial' | 'ahorro'>('resumen');
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [txForm, setTxForm] = useState<TxForm | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState<TransactionType | 'todos'>('todos');
  const [filterCat, setFilterCat] = useState<string | 'todas'>('todas');

  const [savingsForm, setSavingsForm] = useState<{ id: string | null; title: string; target: string; saved: string } | null>(
    null,
  );
  const [deletingSavings, setDeletingSavings] = useState<SavingsGoal | null>(null);
  const [savingsError, setSavingsError] = useState('');

  const monthTx = transactionsOfMonth(data.transactions, month);
  const summary = summarize(monthTx);
  const comparison = compareWithPreviousMonth(data.transactions, month);
  const totalBalance = accumulatedBalance(data.transactions);
  const months = useMemo(() => monthsWithHistory(data.transactions), [data.transactions]);
  const categories = useMemo(() => usedCategories(data.transactions), [data.transactions]);

  const filtered = useMemo(
    () => filterTransactions(data.transactions, { month, type: filterType, category: filterCat }),
    [data.transactions, month, filterType, filterCat],
  );

  function openTxForm(type: TransactionType) {
    setTxForm({
      type,
      description: '',
      amount: '',
      date: today,
      category: type === 'ingreso' ? INCOME_SOURCES[0] : EXPENSE_CATEGORIES[0],
      notes: '',
      transfer: false,
    });
    setEditingTx(null);
    setError('');
  }

  function openEditTx(t: Transaction) {
    setEditingTx(t);
    setTxForm({
      type: t.type,
      description: t.description,
      amount: String(t.amount),
      date: t.date,
      category: t.category,
      notes: t.notes,
      transfer: t.transfer,
    });
    setError('');
  }

  function saveTx() {
    if (!txForm) return;
    const description = txForm.description.trim();
    if (!description) return setError('Ingresá una descripción.');
    if (!isValidISO(txForm.date)) return setError('La fecha no es válida.');
    const amount = parseAmount(txForm.amount);
    if (amount === null) return setError('Ingresá un importe válido en pesos.');
    if (amount < 0) return setError('El importe no puede ser negativo.');
    if (amount === 0) return setError('El importe debe ser mayor a cero.');

    const payload = {
      type: txForm.type,
      description,
      amount,
      date: txForm.date,
      category: txForm.category,
      notes: txForm.notes.trim(),
      transfer: txForm.transfer,
    };
    if (editingTx) updateTransaction(editingTx.id, payload);
    else addTransaction(payload);
    setMonth(monthKey(txForm.date));
    setTxForm(null);
    setEditingTx(null);
    setError('');
  }

  function saveSavings() {
    if (!savingsForm) return;
    const title = savingsForm.title.trim();
    if (!title) return setSavingsError('Ingresá un nombre para el objetivo de ahorro.');
    const target = parseAmount(savingsForm.target);
    if (target === null || target <= 0) return setSavingsError('Ingresá un precio estimado válido.');
    const saved = parseAmount(savingsForm.saved);
    if (saved === null || saved < 0) return setSavingsError('Ingresá un importe ahorrado válido.');

    if (savingsForm.id) updateSavingsGoal(savingsForm.id, { title, target, saved });
    else addSavingsGoal({ title, target, saved });
    setSavingsForm(null);
    setSavingsError('');
  }

  const maxSource = Math.max(1, ...summary.bySource.map((s) => s.total));
  const maxCat = Math.max(1, ...summary.byCategory.map((s) => s.total));

  return (
    <div>
      <div className="page-header">
        <div className="row row--between">
          <div>
            <h1>Finanzas</h1>
            <p>Pesos argentinos · datos solo en este dispositivo</p>
          </div>
          <button className="btn btn--primary" onClick={() => openTxForm('ingreso')}>
            <Icon name="plus" /> Movimiento
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button className={`tabs__btn${tab === 'resumen' ? ' is-active' : ''}`} onClick={() => setTab('resumen')}>
          Resumen
        </button>
        <button className={`tabs__btn${tab === 'historial' ? ' is-active' : ''}`} onClick={() => setTab('historial')}>
          Historial
        </button>
        <button className={`tabs__btn${tab === 'ahorro' ? ' is-active' : ''}`} onClick={() => setTab('ahorro')}>
          Ahorros
        </button>
      </div>

      <div className="row row--wrap" style={{ gap: 8, marginBottom: 14 }}>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
          <Icon name="chevron-left" />
        </button>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ flex: 1, minHeight: 42, padding: '8px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
          aria-label="Elegir mes"
        >
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
          <Icon name="chevron-right" />
        </button>
      </div>

      {tab === 'resumen' && (
        <section className="section">
          <div className="grid-2">
            <Stat label="Ingresos" value={formatARS(summary.income)} tone="success" hint={`${summary.incomeCount} movimientos`} />
            <Stat label="Gastos" value={formatARS(summary.expense)} tone="danger" hint={`${summary.expenseCount} movimientos`} />
            <Stat
              label="Balance del mes"
              value={formatARS(summary.balance)}
              tone={summary.balance >= 0 ? 'success' : 'danger'}
              hint={summary.balance >= 0 ? 'Superávit' : 'Déficit'}
            />
            <Stat
              label="Saldo acumulado"
              value={formatARS(totalBalance)}
              hint="Historial completo registrado"
            />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="card__title">Comparación con el mes anterior</div>
            {!comparison.hasPrevious ? (
              <p className="small muted" style={{ marginTop: 8 }}>
                Todavía no hay datos en {monthLabel(comparison.previousKey)} para comparar.
              </p>
            ) : (
              <div style={{ marginTop: 10 }}>
                <CompareRow label="Ingresos" delta={comparison.incomeDelta} />
                <CompareRow label="Gastos" delta={comparison.expenseDelta} invert />
                <CompareRow label="Balance" delta={comparison.balanceDelta} />
                <p className="tiny muted" style={{ marginTop: 8 }}>
                  Mes anterior ({monthLabel(comparison.previousKey)}): se calcularon los movimientos
                  registrados en ese período.
                </p>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="card__title">Ingresos por fuente</div>
            {summary.bySource.length === 0 ? (
              <p className="small muted" style={{ marginTop: 8 }}>Sin ingresos registrados este mes.</p>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {summary.bySource.map((s) => (
                  <div key={s.label} className="bar-row">
                    <span className="bar-row__label">{s.label}</span>
                    <span className="bar-row__value">{formatARS(s.total)}</span>
                    <Progress value={(s.total / maxSource) * 100} variant="success" label={`Participación de ${s.label} en los ingresos`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="card__title">Gastos por categoría</div>
            {summary.byCategory.length === 0 ? (
              <p className="small muted" style={{ marginTop: 8 }}>Sin gastos registrados este mes.</p>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {summary.byCategory.map((s) => (
                  <div key={s.label} className="bar-row">
                    <span className="bar-row__label">{s.label}</span>
                    <span className="bar-row__value">{formatARS(s.total)}</span>
                    <Progress value={(s.total / maxCat) * 100} variant="warning" label={`Participación de ${s.label} en los gastos`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="tiny muted" style={{ marginTop: 12 }}>
            Las transferencias entre tus propias categorías se registran aparte y no se cuentan como
            ingresos ni como gastos. Un saldo disponible no implica que todo ese dinero sea libre para
            gastar: interpretalo según tu plan.
          </p>
        </section>
      )}

      {tab === 'historial' && (
        <section className="section">
          <div className="row row--wrap" style={{ gap: 8, marginBottom: 12 }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | 'todos')}
              style={{ minHeight: 40, padding: '8px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
              aria-label="Filtrar por tipo"
            >
              <option value="todos">Ingresos y gastos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="gasto">Solo gastos</option>
            </select>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{ minHeight: 40, padding: '8px 10px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10 }}
              aria-label="Filtrar por categoría"
            >
              <option value="todas">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="row row--between" style={{ marginBottom: 10 }}>
            <span className="small muted">
              {filtered.length} movimientos en {monthLabel(month)}
            </span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setFilterType('todos');
                setFilterCat('todas');
                setMonth(currentMonthKey());
              }}
            >
              Limpiar filtros
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="wallet">No hay movimientos con estos filtros.</EmptyState>
          ) : (
            filtered.map((t) => (
              <div key={t.id} className="list-item">
                <div
                  className="stat__label"
                  style={{
                    width: 34,
                    textAlign: 'center',
                    color: t.transfer ? 'var(--info)' : t.type === 'ingreso' ? 'var(--success)' : 'var(--danger)',
                    fontSize: '1rem',
                  }}
                  aria-hidden
                >
                  {t.transfer ? '⇄' : t.type === 'ingreso' ? '+' : '−'}
                </div>
                <div className="list-item__main">
                  <div className="list-item__title">{t.description}</div>
                  <div className="list-item__meta">
                    <span className="chip">{t.category}</span>
                    <span>{formatISO(t.date)}</span>
                    {t.transfer && <span className="chip chip--info">Transferencia</span>}
                    {t.notes && <span>· {t.notes}</span>}
                  </div>
                </div>
                <b
                  style={{
                    color: t.transfer ? 'var(--text-muted)' : t.type === 'ingreso' ? 'var(--success)' : 'var(--danger)',
                    whiteSpace: 'nowrap',
                    fontSize: '0.88rem',
                  }}
                >
                  {t.transfer ? '' : t.type === 'ingreso' ? '+' : '−'}
                  {formatARS(t.amount)}
                </b>
                <div className="row" style={{ gap: 2 }}>
                  <IconButton name="edit" label={`Editar ${t.description}`} bare onClick={() => openEditTx(t)} />
                  <IconButton name="trash" label={`Eliminar ${t.description}`} bare onClick={() => setDeletingTx(t)} />
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'ahorro' && (
        <section className="section">
          <div className="card">
            <div className="card__title">Objetivos de ahorro</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Definí el precio estimado, cuánto ya ahorraste y te mostramos lo que falta.
            </p>
            <button
              className="btn btn--primary btn--sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                setSavingsForm({ id: null, title: '', target: '', saved: '' });
                setSavingsError('');
              }}
            >
              <Icon name="plus" size={15} /> Nuevo objetivo de ahorro
            </button>
          </div>

          {data.savingsGoals.length === 0 ? (
            <EmptyState icon="wallet">No tenés objetivos de ahorro cargados.</EmptyState>
          ) : (
            data.savingsGoals.map((g) => {
              const s = savingsStatus(g);
              return (
                <div key={g.id} className="card">
                  <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ wordBreak: 'break-word' }}>{g.title}</b>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        Precio estimado: {formatARS(s.target)}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <IconButton
                        name="edit"
                        label={`Editar ${g.title}`}
                        bare
                        onClick={() => {
                          setSavingsForm({ id: g.id, title: g.title, target: String(g.target), saved: String(g.saved) });
                          setSavingsError('');
                        }}
                      />
                      <IconButton name="trash" label={`Eliminar ${g.title}`} bare onClick={() => setDeletingSavings(g)} />
                    </div>
                  </div>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <div className="stat" style={{ padding: '9px 11px' }}>
                      <div className="stat__label">Ahorrado</div>
                      <div className="stat__value stat__value--success" style={{ fontSize: '1rem' }}>{formatARS(s.saved)}</div>
                    </div>
                    <div className="stat" style={{ padding: '9px 11px' }}>
                      <div className="stat__label">Restante</div>
                      <div className="stat__value" style={{ fontSize: '1rem' }}>{formatARS(s.remaining)}</div>
                    </div>
                  </div>
                  <div className="row row--between" style={{ marginTop: 10, marginBottom: 6 }}>
                    <span className="tiny muted">Progreso del ahorro</span>
                    <b className="tiny">{s.percent}%</b>
                  </div>
                  <Progress value={s.percent} variant={s.percent >= 100 ? 'success' : 'accent'} label={`Progreso del ahorro de ${s.title}`} />
                </div>
              );
            })
          )}

          <p className="tiny muted" style={{ marginTop: 12 }}>
            Cargá los importes a mano según lo que vayas ahorrando: la app no consulta bancos ni
            servicios externos.
          </p>
        </section>
      )}

      {/* Modal movimiento */}
      {txForm && (
        <Modal title={editingTx ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => { setTxForm(null); setEditingTx(null); }}>
          <div className="form-grid">
            <div className="field">
              <label>Tipo</label>
              <div className="pill-toggle" style={{ alignSelf: 'flex-start' }}>
                <button
                  type="button"
                  className={txForm.type === 'ingreso' ? 'is-active' : ''}
                  onClick={() =>
                    setTxForm({
                      ...txForm,
                      type: 'ingreso',
                      category: INCOME_SOURCES.includes(txForm.category as (typeof INCOME_SOURCES)[number])
                        ? txForm.category
                        : INCOME_SOURCES[0],
                    })
                  }
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  className={txForm.type === 'gasto' ? 'is-active' : ''}
                  onClick={() =>
                    setTxForm({
                      ...txForm,
                      type: 'gasto',
                      category: EXPENSE_CATEGORIES.includes(txForm.category)
                        ? txForm.category
                        : EXPENSE_CATEGORIES[0],
                    })
                  }
                >
                  Gasto
                </button>
              </div>
            </div>

            <Field label="Descripción" error={error && !txForm.description.trim() ? error : ''}>
              <input
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder={txForm.type === 'ingreso' ? 'Ej.: Reparto de bidones' : 'Ej.: Supermercado'}
                autoFocus
              />
            </Field>

            <div className="grid-2">
              <Field label="Importe (ARS)" error={error && !txForm.amount.trim() ? error : ''}>
                <input
                  inputMode="decimal"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  placeholder="Ej.: 15000"
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                />
              </Field>
            </div>

            <Field
              label={txForm.type === 'ingreso' ? 'Fuente de ingreso' : 'Categoría de gasto'}
            >
              <select value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}>
                {(txForm.type === 'ingreso' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <div className="switch-row">
              <div>
                <div style={{ fontWeight: 650, fontSize: '0.86rem' }}>Transferencia entre categorías propias</div>
                <div className="tiny muted">
                  No cuenta como ingreso nuevo ni como gasto.
                </div>
              </div>
              <input
                type="checkbox"
                checked={txForm.transfer}
                onChange={(e) => setTxForm({ ...txForm, transfer: e.target.checked })}
                style={{ width: 22, height: 22 }}
                aria-label="Es una transferencia"
              />
            </div>

            <Field label="Notas (opcional)">
              <textarea value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
            </Field>

            {error ? <div className="field__error">{error}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => { setTxForm(null); setEditingTx(null); }}>
              Cancelar
            </button>
            <button className="btn btn--primary" onClick={saveTx}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal ahorro */}
      {savingsForm && (
        <Modal title={savingsForm.id ? 'Editar objetivo de ahorro' : 'Nuevo objetivo de ahorro'} onClose={() => setSavingsForm(null)}>
          <div className="form-grid">
            <Field label="Nombre">
              <input
                value={savingsForm.title}
                onChange={(e) => setSavingsForm({ ...savingsForm, title: e.target.value })}
                placeholder="Ej.: iPhone 17 Pro Max"
                autoFocus
              />
            </Field>
            <div className="grid-2">
              <Field label="Precio estimado (ARS)">
                <input
                  inputMode="decimal"
                  value={savingsForm.target}
                  onChange={(e) => setSavingsForm({ ...savingsForm, target: e.target.value })}
                  placeholder="Ej.: 2500000"
                />
              </Field>
              <Field label="Importe ahorrado (ARS)">
                <input
                  inputMode="decimal"
                  value={savingsForm.saved}
                  onChange={(e) => setSavingsForm({ ...savingsForm, saved: e.target.value })}
                  placeholder="Ej.: 0"
                />
              </Field>
            </div>
            {savingsError ? <div className="field__error">{savingsError}</div> : null}
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setSavingsForm(null)}>Cancelar</button>
            <button className="btn btn--primary" onClick={saveSavings}>Guardar</button>
          </div>
        </Modal>
      )}

      {deletingTx && (
        <ConfirmDialog
          title="Eliminar movimiento"
          danger
          confirmLabel="Eliminar"
          message={
            <>
              Se eliminará <b>{deletingTx.description}</b> por {formatARS(deletingTx.amount)}. Los
              totales se recalculan automáticamente.
            </>
          }
          onCancel={() => setDeletingTx(null)}
          onConfirm={() => {
            deleteTransaction(deletingTx.id);
            setDeletingTx(null);
          }}
        />
      )}

      {deletingSavings && (
        <ConfirmDialog
          title="Eliminar objetivo de ahorro"
          danger
          confirmLabel="Eliminar"
          message={<>Se eliminará <b>{deletingSavings.title}</b>.</>}
          onCancel={() => setDeletingSavings(null)}
          onConfirm={() => {
            deleteSavingsGoal(deletingSavings.id);
            setDeletingSavings(null);
          }}
        />
      )}

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 18 }}>
        Saldo acumulado registrado: {formatARSCompacto(totalBalance)}
      </p>
    </div>
  );
}

function CompareRow({ label, delta, invert = false }: { label: string; delta: number | null; invert?: boolean }) {
  if (delta === null) {
    return (
      <div className="row row--between" style={{ padding: '6px 0' }}>
        <span className="small">{label}</span>
        <span className="small muted">Sin dato comparable</span>
      </div>
    );
  }
  const positive = invert ? delta <= 0 : delta >= 0;
  return (
    <div className="row row--between" style={{ padding: '6px 0' }}>
      <span className="small">{label}</span>
      <span className="small" style={{ color: delta === 0 ? 'var(--text-muted)' : positive ? 'var(--success)' : 'var(--danger)' }}>
        {delta > 0 ? '+' : ''}
        {delta}% vs. mes anterior
      </span>
    </div>
  );
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
