import { useEffect, useState } from 'react'
import { Pencil, Receipt, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, Input, Modal, PasswordConfirmModal, Select } from '../components/UI'
import { formatCurrency, PAYMENT_MODE_OPTIONS, todayIso } from '../utils/finance'

function ExpenseForm({ form, setForm, onSubmit, loading }) {
  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Card className="p-4">
      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Receipt size={18} className="text-red-500" />Record Expense</h2>
      <Input label="Amount *" type="number" placeholder="0.00" value={form.amount} onChange={set('amount')} />
      <Input label="Expense For / Purpose *" placeholder="Transport, salary, rent..." value={form.purpose} onChange={set('purpose')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
        <Select label="Payment Mode *" value={form.paymentMode} onChange={set('paymentMode')}>
          {PAYMENT_MODE_OPTIONS.filter(mode => mode !== 'Cheque').map(mode => <option key={mode} value={mode}>{mode}</option>)}
        </Select>
      </div>
      <Input label="Category" placeholder="Optional category" value={form.category} onChange={set('category')} />
      <Input label="Narration" placeholder="Optional notes" value={form.narration} onChange={set('narration')} />
      <Button onClick={onSubmit} loading={loading} variant="danger" className="w-full justify-center">Save Expense</Button>
    </Card>
  )
}

function ExpenseEditModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState({
    amount: String(expense.amount || ''),
    purpose: expense.purpose || '',
    date: expense.date || todayIso(),
    paymentMode: expense.paymentMode || 'Cash',
    narration: expense.narration || '',
    category: expense.category || '',
  })

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Modal title="Edit Expense" onClose={onClose}>
      <Input label="Amount *" type="number" value={form.amount} onChange={set('amount')} />
      <Input label="Expense For / Purpose *" value={form.purpose} onChange={set('purpose')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
        <Select label="Payment Mode *" value={form.paymentMode} onChange={set('paymentMode')}>
          {PAYMENT_MODE_OPTIONS.filter(mode => mode !== 'Cheque').map(mode => <option key={mode} value={mode}>{mode}</option>)}
        </Select>
      </div>
      <Input label="Category" value={form.category} onChange={set('category')} />
      <Input label="Narration" value={form.narration} onChange={set('narration')} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)}>Save Changes</Button>
      </div>
    </Modal>
  )
}

export default function Expenses() {
  const { dataVersion, syncFinanceData } = useApp()
  const { verifyPassword } = useAuth()
  const [form, setForm] = useState({ amount: '', purpose: '', date: todayIso(), paymentMode: 'Cash', narration: '', category: '' })
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [editingExpense, setEditingExpense] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  useEffect(() => {
    async function loadExpenses() {
      const rows = await db.expenses.orderBy('date').reverse().toArray()
      setExpenses(rows)
    }

    loadExpenses()
  }, [dataVersion])

  async function handleCreate() {
    if (!form.amount || !form.purpose || !form.date) return toast.error('Amount, purpose, and date are required')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount')

    setLoading(true)
    try {
      await db.expenses.add({
        amount,
        purpose: form.purpose.trim(),
        date: form.date,
        paymentMode: form.paymentMode,
        narration: form.narration.trim(),
        category: form.category.trim(),
        createdAt: new Date().toISOString(),
      })
      await syncFinanceData()
      setForm({ amount: '', purpose: '', date: todayIso(), paymentMode: 'Cash', narration: '', category: '' })
      toast.success('Expense recorded')
    } finally {
      setLoading(false)
    }
  }

  function queueUpdate(formValues) {
    const amount = Number(formValues.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount')
    if (!formValues.purpose?.trim() || !formValues.date) return toast.error('Purpose and date are required')

    setPendingAction({
      title: 'Confirm Expense Update',
      message: 'Enter your password before saving this expense change.',
      confirmLabel: 'Save Expense',
      tone: 'primary',
      action: async () => {
        await db.expenses.update(editingExpense.id, {
          amount,
          purpose: formValues.purpose.trim(),
          date: formValues.date,
          paymentMode: formValues.paymentMode,
          narration: formValues.narration.trim(),
          category: formValues.category.trim(),
          updatedAt: new Date().toISOString(),
        })
        await syncFinanceData()
        setEditingExpense(null)
        setPendingAction(null)
        toast.success('Expense updated')
      }
    })
  }

  function queueDelete(expense) {
    setPendingAction({
      title: 'Confirm Expense Deletion',
      message: 'Enter your password before deleting this expense.',
      confirmLabel: 'Delete Expense',
      tone: 'danger',
      action: async () => {
        await db.expenses.delete(expense.id)
        await syncFinanceData()
        setPendingAction(null)
        toast.success('Expense deleted')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <p className="text-sm text-gray-500 mt-1">Track red-flag outflows and keep cash, bank, and P/L synced automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <ExpenseForm form={form} setForm={setForm} onSubmit={handleCreate} loading={loading} />

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Expense History</h2>
            <span className="text-sm text-red-500 font-medium">{formatCurrency(expenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0))}</span>
          </div>
          {expenses.length === 0 ? (
            <EmptyState icon={Receipt} message="No expenses recorded yet." />
          ) : (
            <div className="divide-y">
              {expenses.map(expense => (
                <div key={expense.id} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{expense.purpose}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {expense.date} | {expense.paymentMode} {expense.category ? `| ${expense.category}` : ''}
                    </p>
                    {expense.narration && <p className="text-xs text-gray-400 mt-1">{expense.narration}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingExpense(expense)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <Pencil size={15} className="text-gray-500" />
                      </button>
                      <button onClick={() => queueDelete(expense)} className="p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {editingExpense && (
        <ExpenseEditModal expense={editingExpense} onClose={() => setEditingExpense(null)} onSave={queueUpdate} />
      )}

      {pendingAction && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          title={pendingAction.title}
          message={pendingAction.message}
          confirmLabel={pendingAction.confirmLabel}
          tone={pendingAction.tone}
          onConfirm={pendingAction.action}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}
