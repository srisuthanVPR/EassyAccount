import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, Download, BookOpen, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, Modal, PasswordConfirmModal, Badge, EmptyState } from '../components/UI'
import { addWorksheetFromObjects, downloadWorkbook } from '../utils/excel'
import { buildLedgerRows, formatCurrency, PAYMENT_MODE_OPTIONS } from '../utils/finance'

function EditModal({ txn, onClose, onRequestSave }) {
  const [form, setForm] = useState({
    amount: String(txn.amount || ''),
    date: txn.date || '',
    narration: txn.narration || '',
    mode: txn.mode || 'Cash',
  })

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Modal title={`Edit ${txn.type === 'sale' ? 'Sale' : 'Payment'}`} onClose={onClose}>
      <Input label="Amount *" type="number" value={form.amount} onChange={set('amount')} />
      <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
      {txn.type === 'payment' && (
        <Select label="Mode" value={form.mode} onChange={set('mode')}>
          {PAYMENT_MODE_OPTIONS.map(mode => <option key={mode} value={mode}>{mode}</option>)}
        </Select>
      )}
      <Input label="Narration" value={form.narration} onChange={set('narration')} />
      <div className="flex gap-2 justify-end mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onRequestSave(form)}>Save</Button>
      </div>
    </Modal>
  )
}

export default function Ledger() {
  const { accounts, dataVersion, loadAccounts, loadStock, syncFinanceData } = useApp()
  const { verifyPassword } = useAuth()
  const [selectedAccount, setSelectedAccount] = useState('')
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editTxn, setEditTxn] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const selectedAccountData = useMemo(
    () => accounts.find(account => account.id === Number(selectedAccount)),
    [accounts, selectedAccount]
  )

  const loadLedger = useCallback(async () => {
    if (!selectedAccount) {
      setTransactions([])
      return
    }

    setLoading(true)
    try {
      const rows = await db.transactions.where('accountId').equals(Number(selectedAccount)).sortBy('date')
      setTransactions(rows)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount])

  useEffect(() => {
    loadLedger()
  }, [loadLedger, dataVersion])

  const filtered = useMemo(() => {
    let rows = [...transactions]
    if (search) {
      const query = search.toLowerCase()
      rows = rows.filter(entry =>
        entry.narration?.toLowerCase().includes(query) ||
        entry.type?.toLowerCase().includes(query) ||
        entry.mode?.toLowerCase().includes(query)
      )
    }
    if (dateFrom) rows = rows.filter(entry => entry.date >= dateFrom)
    if (dateTo) rows = rows.filter(entry => entry.date <= dateTo)
    return rows
  }, [transactions, search, dateFrom, dateTo])

  const ledgerRows = useMemo(
    () => buildLedgerRows(filtered, selectedAccountData?.openingBalance || 0),
    [filtered, selectedAccountData]
  )

  const totalSales = filtered.filter(entry => entry.type === 'sale').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const totalPayments = filtered.filter(entry => entry.type === 'payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const closingBalance = (selectedAccountData?.openingBalance || 0) + totalSales - totalPayments

  function queueUpdate(formValues) {
    const amount = Number(formValues.amount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount')
    if (!formValues.date) return toast.error('Date is required')

    setPendingAction({
      title: 'Confirm Ledger Update',
      message: 'Enter your password before saving this ledger edit.',
      confirmLabel: 'Save Changes',
      tone: 'primary',
      action: async () => {
        await db.transactions.update(editTxn.id, {
          amount,
          date: formValues.date,
          narration: formValues.narration.trim(),
          ...(editTxn.type === 'payment' ? { mode: formValues.mode } : {}),
          updatedAt: new Date().toISOString(),
        })
        await syncFinanceData()
        setPendingAction(null)
        setEditTxn(null)
        toast.success('Ledger entry updated')
      }
    })
  }

  function queueDelete(transaction) {
    setPendingAction({
      title: 'Confirm Ledger Deletion',
      message: 'Enter your password before deleting this financial entry.',
      confirmLabel: 'Delete Entry',
      tone: 'danger',
      action: async () => {
        if (transaction.type === 'sale' && transaction.itemId && transaction.quantity) {
          const stockEntry = await db.stock.where('itemId').equals(transaction.itemId).first()
          if (stockEntry) {
            await db.stock.update(stockEntry.id, { available: stockEntry.available + transaction.quantity })
            await loadStock()
          }
        }

        await db.transactions.delete(transaction.id)
        await syncFinanceData()
        setPendingAction(null)
        toast.success('Ledger entry deleted')
      }
    })
  }

  async function exportExcel() {
    if (!ledgerRows.length) return toast.error('No data to export')

    const rows = ledgerRows.map(entry => ({
      Date: entry.date,
      Type: entry.type === 'sale' ? 'Sale' : 'Payment',
      Sale: entry.type === 'sale' ? entry.amount : '',
      Payment: entry.type === 'payment' ? entry.amount : '',
      Mode: entry.mode || '',
      RunningBalance: entry.balance,
      Narration: entry.narration || '',
    }))

    await downloadWorkbook(
      `Ledger_${selectedAccountData?.name || 'Account'}_${new Date().toISOString().split('T')[0]}.xlsx`,
      async workbook => addWorksheetFromObjects(workbook, 'Ledger', rows)
    )
    toast.success('Excel exported')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Opening balances, running balances, edits, and deletes all stay in sync.</p>
        </div>
        {selectedAccount && (
          <Button variant="success" onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
        )}
      </div>

      <Card className="p-4">
        <Select label="Select Account" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
          <option value="">Choose an account...</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
        </Select>

        {selectedAccount && (
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        )}
      </Card>

      {selectedAccount && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4 text-center"><p className="text-xs text-gray-400">Opening Balance</p><p className="font-bold text-slate-700 mt-2">{formatCurrency(selectedAccountData?.openingBalance || 0)}</p></Card>
            <Card className="p-4 text-center"><p className="text-xs text-gray-400">Total Sales</p><p className="font-bold text-yellow-600 mt-2">{formatCurrency(totalSales)}</p></Card>
            <Card className="p-4 text-center"><p className="text-xs text-gray-400">Total Payments</p><p className="font-bold text-green-600 mt-2">{formatCurrency(totalPayments)}</p></Card>
            <Card className="p-4 text-center"><p className="text-xs text-gray-400">Closing Balance</p><p className={`font-bold mt-2 ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(closingBalance)}</p></Card>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : ledgerRows.length === 0 ? (
              <EmptyState icon={BookOpen} message="No transactions found for this account." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sale</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Mode</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Running Balance</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Narration</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map(entry => (
                      <tr key={entry.id} className={`border-b last:border-0 ${entry.type === 'sale' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.date}</td>
                        <td className="px-4 py-3">
                          <Badge color={entry.type === 'sale' ? 'yellow' : 'green'}>
                            {entry.type === 'sale' ? 'Sale' : 'Payment'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-yellow-700">{entry.type === 'sale' ? formatCurrency(entry.amount) : ''}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{entry.type === 'payment' ? formatCurrency(entry.amount) : ''}</td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{entry.mode || '-'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(entry.balance)}</td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{entry.narration || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditTxn(entry)} className="p-1.5 hover:bg-white rounded-lg">
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button onClick={() => queueDelete(entry)} className="p-1.5 hover:bg-white rounded-lg">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {editTxn && (
        <EditModal txn={editTxn} onClose={() => setEditTxn(null)} onRequestSave={queueUpdate} />
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
