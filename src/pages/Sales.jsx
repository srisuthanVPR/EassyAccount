import { useEffect, useState } from 'react'
import { TrendingUp, Trash2 } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, PasswordConfirmModal } from '../components/UI'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function Sales() {
  const { accounts, items, dataVersion, loadAccounts, loadItems, loadStock, syncFinanceData } = useApp()
  const { verifyPassword } = useAuth()
  const [form, setForm] = useState({ accountId: '', pricePerUnit: '', date: today(), quantity: '', narration: '', itemId: '' })
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [deleteTxnId, setDeleteTxnId] = useState(null)

  // Auto-calculated amount = quantity × pricePerUnit
  const amount = form.quantity && form.pricePerUnit
    ? (parseFloat(form.quantity) * parseFloat(form.pricePerUnit)).toFixed(2)
    : ''

  useEffect(() => { loadAccounts(); loadItems() }, [loadAccounts, loadItems])
  useEffect(() => { loadRecent() }, [dataVersion])

  async function loadRecent() {
    const all = await db.transactions.where('type').equals('sale').sortBy('date')
    const txns = all.slice(-10).reverse()
    const withNames = await Promise.all(txns.map(async t => {
      const acc = await db.accounts.get(t.accountId)
      const item = t.itemId ? await db.items.get(t.itemId) : null
      return { ...t, accountName: acc?.name || 'Unknown', itemName: item?.name || null }
    }))
    setRecent(withNames)
  }

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSave() {
    if (!form.accountId || !amount || !form.date) return toast.error('Account, quantity, price and date required')
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid amount')
    if (form.itemId && !form.quantity) return toast.error('Quantity is required when an item is selected')

    setLoading(true)
    try {
      if (form.itemId && form.quantity) {
        const qty = parseFloat(form.quantity)
        if (isNaN(qty) || qty <= 0) { toast.error('Invalid quantity'); return }
        const stockEntry = await db.stock.where('itemId').equals(parseInt(form.itemId)).first()
        if (!stockEntry) { toast.error('No stock record found for the selected item'); return }
        if (stockEntry.available < qty) {
          toast.error(`Insufficient stock. Available: ${stockEntry.available} ${stockEntry.unit}`)
          return
        }
        // Sales reduce ONLY available stock, not total
        await db.stock.update(stockEntry.id, { available: stockEntry.available - qty })
      }
      await db.transactions.add({
        accountId: parseInt(form.accountId),
        type: 'sale',
        amount: amt,
        pricePerUnit: form.pricePerUnit ? parseFloat(form.pricePerUnit) : null,
        date: form.date,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        itemId: form.itemId ? parseInt(form.itemId) : null,
        narration: form.narration,
        createdAt: new Date().toISOString()
      })
      toast.success('Sale recorded')
      setForm({ accountId: '', pricePerUnit: '', date: today(), quantity: '', narration: '', itemId: '' })
      await loadStock()
      await syncFinanceData()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const txn = recent.find(t => t.id === deleteTxnId)
    if (txn?.itemId && txn.quantity) {
      const stockEntry = await db.stock.where('itemId').equals(txn.itemId).first()
      if (stockEntry) {
        // Restore available stock on delete
        await db.stock.update(stockEntry.id, { available: stockEntry.available + txn.quantity })
      }
    }
    await db.transactions.delete(deleteTxnId)
    toast.success('Sale deleted')
    setDeleteTxnId(null)
    await loadStock()
    await syncFinanceData()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Sales</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18} />New Sale</h2>
          <Select label="Account *" value={form.accountId} onChange={set('accountId')}>
            <option value="">Select account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Item (optional)" value={form.itemId} onChange={set('itemId')}>
              <option value="">No item</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </Select>
            <Input label="Quantity" type="number" placeholder="0" value={form.quantity} onChange={set('quantity')} />
          </div>
          <Input label="Price per Unit (₹)" type="number" placeholder="0.00" value={form.pricePerUnit} onChange={set('pricePerUnit')} />
          {/* Auto-calculated amount — readonly */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) — auto calculated</label>
            <input
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 font-semibold"
              value={amount ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
              placeholder="Qty × Price"
            />
          </div>
          <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
          <Input label="Narration" placeholder="Notes..." value={form.narration} onChange={set('narration')} />
          <Button onClick={handleSave} loading={loading} className="w-full justify-center">Save Sale</Button>
        </Card>

        <Card>
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Sales</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No sales yet</div>
          ) : (
            <div className="divide-y">
              {recent.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.accountName}</p>
                    <p className="text-xs text-gray-400">
                      {t.date}
                      {t.itemName && ` • ${t.itemName}`}
                      {t.quantity && ` × ${t.quantity}`}
                      {t.pricePerUnit && ` @ ₹${t.pricePerUnit}`}
                      {t.narration && ` • ${t.narration}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600">₹{t.amount?.toLocaleString('en-IN')}</span>
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
