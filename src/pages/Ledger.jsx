import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, Download, BookOpen, Search } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, Modal, PasswordConfirmModal, Badge, EmptyState } from '../components/UI'
import { addWorksheetFromObjects, downloadWorkbook } from '../utils/excel'
import toast from 'react-hot-toast'

function EditModal({ txn, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: txn.amount || '',
    date: txn.date || '',
    narration: txn.narration || '',
    mode: txn.mode || 'Cash',
  })
  const [loading, setLoading] = useState(false)

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSave() {
    if (!form.amount || !form.date) return toast.error('Amount and date required')
    const newAmount = parseFloat(form.amount)
    if (isNaN(newAmount) || newAmount <= 0) return toast.error('Invalid amount')

    setLoading(true)
    try {
      await db.transactions.update(txn.id, {
        amount: newAmount,
        date: form.date,
        narration: form.narration,
        ...(txn.type === 'payment' ? { mode: form.mode } : {}),
        updatedAt: new Date().toISOString()
      })

      toast.success('Transaction updated')
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Edit ${txn.type === 'sale' ? 'Sale' : 'Payment'}`} onClose={onClose}>
      <Input label="Amount (₹) *" type="number" value={form.amount} onChange={set('amount')} />
      <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
      {txn.type === 'payment' && (
        <Select label="Mode" value={form.mode} onChange={set('mode')}>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank Transfer</option>
          <option value="UPI">UPI</option>
          <option value="Cheque">Cheque</option>
        </Select>
      )}
      <Input label="Narration" value={form.narration} onChange={set('narration')} />
      <div className="flex gap-2 justify-end mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Update</Button>
      </div>
    </Modal>
  )
}

export default function Ledger() {
  const { accounts, dataVersion, loadAccounts, loadStock, notifyDataChanged } = useApp()
  const { verifyPassword } = useAuth()
  const [selectedAccount, setSelectedAccount] = useState('')
  const [transactions, setTransactions] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editTxn, setEditTxn] = useState(null)
  const [deleteTxnId, setDeleteTxnId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const loadLedger = useCallback(async () => {
    setLoading(true)
    try {
      const txns = await db.transactions
        .where('accountId').equals(parseInt(selectedAccount))
        .sortBy('date')
      setTransactions(txns)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount])

  useEffect(() => {
    if (selectedAccount) loadLedger()
    else setTransactions([])
  }, [selectedAccount, dataVersion, loadLedger])

  const applyFilters = useCallback(() => {
    let result = [...transactions]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.narration?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.mode?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) result = result.filter(t => t.date >= dateFrom)
    if (dateTo) result = result.filter(t => t.date <= dateTo)
    setFiltered(result)
  }, [transactions, search, dateFrom, dateTo])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Compute running balance
  function withBalance(txns) {
    let balance = 0
    return txns.map(t => {
      if (t.type === 'sale') balance += t.amount
      else if (t.type === 'payment') balance -= t.amount
      return { ...t, balance }
    })
  }

  async function handleDelete() {
    const txn = transactions.find(t => t.id === deleteTxnId)
    if (txn?.type === 'sale' && txn.itemId && txn.quantity) {
      const stockEntry = await db.stock.where('itemId').equals(txn.itemId).first()
      if (stockEntry) {
        await db.stock.update(stockEntry.id, { available: stockEntry.available + txn.quantity })
      }
      await loadStock()
    }
    await db.transactions.delete(deleteTxnId)
    toast.success('Transaction deleted')
    setDeleteTxnId(null)
    notifyDataChanged()
  }

  async function exportExcel() {
    if (!filtered.length) return toast.error('No data to export')
    const accName = accounts.find(a => a.id === parseInt(selectedAccount))?.name || 'Account'
    const rows = withBalance(filtered).map(t => ({
      Date: t.date,
      Type: t.type === 'sale' ? 'Sale' : 'Payment',
      Amount: t.type === 'sale' ? t.amount : '',
      'Payment Received': t.type === 'payment' ? t.amount : '',
      Mode: t.mode || '',
      Balance: t.balance,
      Narration: t.narration || '',
    }))
    await downloadWorkbook(
      `Ledger_${accName}_${new Date().toISOString().split('T')[0]}.xlsx`,
      async workbook => {
        addWorksheetFromObjects(workbook, 'Ledger', rows)
      }
    )
    toast.success('Excel exported!')
  }

  const ledgerRows = withBalance(filtered)
  const totalSales = filtered.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0)
  const totalPayments = filtered.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0)
  const closingBalance = totalSales - totalPayments
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Ledger</h1>
        {selectedAccount && (
          <Button variant="success" onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
        )}
      </div>

      <Card className="p-4 mb-4">
        <Select label="Select Account" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
          <option value="">Choose an account...</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From date" />
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To date" />
          </div>
        )}
      </Card>

      {selectedAccount && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Sales</p>
              <p className="font-bold text-blue-600 text-sm">{fmt(totalSales)}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Payments</p>
              <p className="font-bold text-green-600 text-sm">{fmt(totalPayments)}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Balance Due</p>
              <p className={`font-bold text-sm ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(closingBalance)}</p>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : ledgerRows.length === 0 ? (
              <EmptyState icon={BookOpen} message="No transactions found" />
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
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Narration</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map(t => (
                      <tr
                        key={t.id}
                        className={`border-b last:border-0 hover:opacity-90 transition-opacity ${t.type === 'sale' ? 'bg-yellow-50' : 'bg-green-50'}`}
                      >
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-3">
                          <Badge color={t.type === 'sale' ? 'yellow' : 'green'}>
                            {t.type === 'sale' ? 'Sale' : 'Payment'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-blue-700">
                          {t.type === 'sale' ? fmt(t.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">
                          {t.type === 'payment' ? fmt(t.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{t.mode || '—'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${t.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {fmt(t.balance)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[150px] truncate">{t.narration || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditTxn(t)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button onClick={() => setDeleteTxnId(t.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-gray-700">Closing Balance</td>
                      <td className="px-4 py-3 text-right text-blue-700">{fmt(totalSales)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmt(totalPayments)}</td>
                      <td className="hidden sm:table-cell"></td>
                      <td className={`px-4 py-3 text-right ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(closingBalance)}</td>
                      <td className="hidden md:table-cell"></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {editTxn && <EditModal txn={editTxn} onClose={() => setEditTxn(null)} onSaved={notifyDataChanged} />}
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
