import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { ArrowDownLeft, ArrowUpRight, Landmark, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, EmptyState, Button, Input, Modal, PasswordConfirmModal } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { calculateBankAccountSummary, formatCurrency, normalizeAmount, sortByDateAndTime } from '../utils/finance'
import { db } from '../db'

function OpeningBalanceModal({ value, onClose, onSubmit }) {
  const [amount, setAmount] = useState(String(normalizeAmount(value)))

  return (
    <Modal title="Edit Initial Amount" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        Update the bank opening balance. This will be included in the current balance calculation immediately.
      </p>
      <Input
        label="Initial Amount / Opening Balance"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(amount)}>Continue</Button>
      </div>
    </Modal>
  )
}

export default function BankAccount() {
  const { verifyPassword } = useAuth()
  const [entries, setEntries] = useState([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [showOpeningEditor, setShowOpeningEditor] = useState(false)
  const [pendingOpeningBalance, setPendingOpeningBalance] = useState(null)

  useEffect(() => {
    const bankEntriesSubscription = liveQuery(() => db.bankTransactions.toArray()).subscribe({
      next: rows => setEntries(sortByDateAndTime(rows).reverse()),
      error: error => console.error('Failed to watch bank transactions', error),
    })

    const bankStateSubscription = liveQuery(() => db.bankState.get('primary')).subscribe({
      next: state => setOpeningBalance(normalizeAmount(state?.openingBalance)),
      error: error => console.error('Failed to watch bank opening balance', error),
    })

    return () => {
      bankEntriesSubscription.unsubscribe()
      bankStateSubscription.unsubscribe()
    }
  }, [])

  const summary = calculateBankAccountSummary(openingBalance, entries)

  function requestOpeningBalanceUpdate(rawAmount) {
    const nextAmount = normalizeAmount(rawAmount)
    setPendingOpeningBalance(nextAmount)
    setShowOpeningEditor(false)
  }

  async function saveOpeningBalance() {
    await db.bankState.put({
      key: 'primary',
      openingBalance: normalizeAmount(pendingOpeningBalance),
      updatedAt: new Date().toISOString(),
    })
    setPendingOpeningBalance(null)
    toast.success('Bank opening balance updated')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Bank Account</h1>
        <p className="text-sm text-gray-500 mt-1">Opening balance plus live bank inflow and outflow tracking for UPI and bank-linked movement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Initial Amount</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">{formatCurrency(summary.openingBalance)}</p>
            </div>
            <button
              onClick={() => setShowOpeningEditor(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Edit initial amount"
            >
              <Pencil size={16} className="text-gray-500" />
            </button>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Inflow</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(summary.inflow)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Outflow</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(summary.outflow)}</p>
        </Card>
        <Card className="p-4 border-2 border-blue-100 bg-blue-50/40">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className={`text-2xl font-bold mt-2 ${summary.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.currentBalance)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">Transaction History</h2>
        </div>
        {entries.length === 0 ? (
          <EmptyState icon={Landmark} message="No bank transactions recorded yet. Current balance will follow the initial amount." />
        ) : (
          <div className="divide-y">
            {entries.map(entry => (
              <div key={`${entry.sourceTable}-${entry.sourceId}`} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center ${entry.direction === 'inflow' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {entry.direction === 'inflow' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{entry.sourceType === 'payment' ? 'Payment' : 'Expense'}</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.date} | {entry.mode || 'Bank'}</p>
                    {entry.narration && <p className="text-xs text-gray-400 mt-1">{entry.narration}</p>}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${entry.direction === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.direction === 'inflow' ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showOpeningEditor && (
        <OpeningBalanceModal
          value={summary.openingBalance}
          onClose={() => setShowOpeningEditor(false)}
          onSubmit={requestOpeningBalanceUpdate}
        />
      )}

      {pendingOpeningBalance !== null && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          title="Confirm Initial Amount Update"
          message="Enter your password before saving the bank opening balance."
          confirmLabel="Save Initial Amount"
          tone="primary"
          onConfirm={saveOpeningBalance}
          onCancel={() => setPendingOpeningBalance(null)}
        />
      )}
    </div>
  )
}
