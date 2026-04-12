import { useEffect, useState, useCallback } from 'react'
import { CreditCard, Trash2 } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, PasswordConfirmModal } from '../components/UI'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]
const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })

export default function Payment() {
  const { accounts, dataVersion, loadAccounts, notifyDataChanged } = useApp()
  const { verifyPassword } = useAuth()
  const [form, setForm] = useState({ accountId: '', amount: '', mode: 'Cash', date: today(), narration: '' })
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [deleteTxnId, setDeleteTxnId] = useState(null)
  const [currentBalance, setCurrentBalance] = useState(null)

  useEffect(() => { loadAccounts() }, [loadAccounts])
  useEffect(() => { loadRecent() }, [dataVersion])

  // Fetch current balance for selected account
  const fetchBalance = useCallback(async (accountId) => {
    if (!accountId) { setCurrentBalance(null); return }
    const txns = await db.transactions.where('accountId').equals(parseInt(accountId)).toArray()
    const sales = txns.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount || 0), 0)
    const payments = txns.filter(t => t.type === 'payment').reduce((s, t) => s + (t.amount || 0), 0)
    setCurrentBalance(sales - payments)
  }, [])

  useEffect(() => { fetchBalance(form.accountId) }, [form.accountId, dataVersion, fetchBalance])

  // Live updated balance preview
  const enteredAmt = parseFloat(form.amount) || 0
  const updatedBalance = currentBalance !== null ? currentBalance - enteredAmt : null
  const isOverpayment = updatedBalance !== null && updatedBalance < 0

  async function loadRecent() {
    const all = await db.transactions.where('type').equals('payment').sortBy('date')
    const txns = all.slice(-10).reverse()
    const withNames = await Promise.all(txns.map(async t => {
      const acc = await db.accounts.get(t.accountId)
      return { ...t, accountName: acc?.name || 'Unknown' }
    }))
    setRecent(withNames)
  }

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSave() {
    if (!form.accountId || !form.amount) return toast.error('Account and amount required')
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount')
    if (isOverpayment) return toast.error('Payment exceeds current balance')
    setLoading(true)
    try {
      await db.transactions.add({
        accountId: parseInt(form.accountId),
        type: 'payment',
        amount,
        mode: form.mode,
        date: form.date,
        narration: form.narration,
        createdAt: new Date().toISOString()
      })
      toast.success('Payment recorded')
      setForm({ accountId: '', amount: '', mode: 'Cash', date: today(), narration: '' })
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    await db.transactions.delete(deleteTxnId)
    toast.success('Payment deleted')
    setDeleteTxnId(null)
    notifyDataChanged()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Payment</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><CreditCard size={18} />Record Payment</h2>
          <Select label="Account *" value={form.accountId} onChange={set('accountId')}>
            <option value="">Select account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>

          {/* Balance preview panel */}
          {form.accountId && currentBalance !== null && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Balance</span>
                <span className={`font-semibold ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(currentBalance)}</span>
              </div>
              {form.amount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Amount</span>
                    <span className="font-semibold text-gray-700">{fmt(enteredAmt)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-medium">Updated Balance</span>
                    <span className={`font-bold ${isOverpayment ? 'text-red-600' : updatedBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {fmt(updatedBalance)}
                    </span>
                  </div>
                  {isOverpayment && (
                    <p className="text-xs text-red-500 font-medium">⚠ Payment exceeds current balance</p>
                  )}
                </>
              )}
            </div>
          )}

          <Input label="Amount (₹) *" type="number" placeholder="0.00" value={form.amount} onChange={set('amount')} />
          <Select label="Mode" value={form.mode} onChange={set('mode')}>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
          </Select>
          <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
          <Input label="Narration" placeholder="Notes..." value={form.narration} onChange={set('narration')} />
          <Button onClick={handleSave} loading={loading} variant="success" className="w-full justify-center">Record Payment</Button>
        </Card>

        <Card>
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Payments</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            <div className="divide-y">
              {recent.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.accountName}</p>
                    <p className="text-xs text-gray-400">{t.date} • {t.mode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">{fmt(t.amount)}</span>
                    <button onClick={() => setDeleteTxnId(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {deleteTxnId && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTxnId(null)}
        />
      )}
    </div>
  )
}
