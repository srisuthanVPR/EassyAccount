import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, PasswordConfirmModal } from '../components/UI'
import { buildAccountSummaries, formatCurrency, PAYMENT_MODE_OPTIONS, todayIso } from '../utils/finance'

export default function Payment() {
  const { accounts, dataVersion, loadAccounts, syncFinanceData } = useApp()
  const { verifyPassword } = useAuth()
  const [form, setForm] = useState({ accountId: '', amount: '', mode: 'Cash', date: todayIso(), narration: '' })
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [deleteTxnId, setDeleteTxnId] = useState(null)
  const [accountSummaries, setAccountSummaries] = useState([])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  useEffect(() => {
    async function loadRecent() {
      const [transactions, paymentRows] = await Promise.all([
        db.transactions.toArray(),
        db.transactions.where('type').equals('payment').sortBy('date'),
      ])

      setAccountSummaries(buildAccountSummaries(accounts, transactions))

      const recentRows = paymentRows.slice(-10).reverse()
      const withNames = await Promise.all(recentRows.map(async transaction => {
        const account = await db.accounts.get(transaction.accountId)
        return { ...transaction, accountName: account?.name || 'Unknown' }
      }))
      setRecent(withNames)
    }

    loadRecent()
  }, [accounts, dataVersion])

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const currentAccount = useMemo(
    () => accountSummaries.find(account => account.id === Number(form.accountId)),
    [accountSummaries, form.accountId]
  )

  const enteredAmount = Number(form.amount || 0)
  const updatedBalance = currentAccount ? currentAccount.balance - enteredAmount : null
  const isOverpayment = updatedBalance !== null && updatedBalance < 0

  async function handleSave() {
    if (!form.accountId || !form.amount) return toast.error('Account and amount are required')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount')
    if (isOverpayment) return toast.error('Payment exceeds current account balance')

    setLoading(true)
    try {
      await db.transactions.add({
        accountId: Number(form.accountId),
        type: 'payment',
        amount,
        mode: form.mode,
        date: form.date,
        narration: form.narration.trim(),
        createdAt: new Date().toISOString(),
      })
      await syncFinanceData()
      setForm({ accountId: '', amount: '', mode: 'Cash', date: todayIso(), narration: '' })
      toast.success('Payment recorded')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    await db.transactions.delete(deleteTxnId)
    await syncFinanceData()
    setDeleteTxnId(null)
    toast.success('Payment deleted')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Payment mode decides whether the receipt lands in Cashbox or Bank Account.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><CreditCard size={18} className="text-green-600" />Record Payment</h2>
          <Select label="Account *" value={form.accountId} onChange={set('accountId')}>
            <option value="">Select account</option>
            {accountSummaries.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.balance)})
              </option>
            ))}
          </Select>

          {currentAccount && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Opening Balance</span>
                <span className="font-semibold text-gray-700">{formatCurrency(currentAccount.openingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Balance</span>
                <span className={`font-semibold ${currentAccount.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(currentAccount.balance)}</span>
              </div>
              {form.amount && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Balance After Payment</span>
                  <span className={`font-bold ${isOverpayment ? 'text-red-600' : updatedBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(updatedBalance)}
                  </span>
                </div>
              )}
            </div>
          )}

          <Input label="Amount *" type="number" placeholder="0.00" value={form.amount} onChange={set('amount')} />
          <Select label="Payment Mode *" value={form.mode} onChange={set('mode')}>
            {PAYMENT_MODE_OPTIONS.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </Select>
          <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
          <Input label="Narration" placeholder="Notes..." value={form.narration} onChange={set('narration')} />
          <Button onClick={handleSave} loading={loading} variant="success" className="w-full justify-center">Record Payment</Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Payments</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No payments yet</div>
          ) : (
            <div className="divide-y">
              {recent.map(transaction => (
                <div key={transaction.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{transaction.accountName}</p>
                    <p className="text-xs text-gray-400">{transaction.date} | {transaction.mode}</p>
                    {transaction.narration && <p className="text-xs text-gray-400 mt-1">{transaction.narration}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(transaction.amount)}</span>
                    <button onClick={() => setDeleteTxnId(transaction.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
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
          title="Confirm Payment Deletion"
          message="Enter your password before deleting this payment."
          confirmLabel="Delete Payment"
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTxnId(null)}
        />
      )}
    </div>
  )
}
