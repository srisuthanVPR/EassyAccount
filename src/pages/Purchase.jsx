import { useEffect, useState } from 'react'
import { ShoppingCart, Trash2, Pencil } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, PasswordConfirmModal, Modal } from '../components/UI'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

function PurchaseEditModal({ purchase, accounts, items, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountId: String(purchase.accountId || ''),
    itemId: String(purchase.itemId || ''),
    quantity: String(purchase.quantity || ''),
    date: purchase.date || today(),
    narration: purchase.narration || '',
  })
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave() {
    if (!form.accountId || !form.itemId || !form.quantity) {
      return toast.error('Account, item and quantity required')
    }

    const newQuantity = parseFloat(form.quantity)
    if (isNaN(newQuantity) || newQuantity <= 0) return toast.error('Invalid quantity')

    const nextItemId = parseInt(form.itemId)
    const previousItemId = purchase.itemId

    setLoading(true)
    try {
      const previousStock = await db.stock.where('itemId').equals(previousItemId).first()
      if (!previousStock) throw new Error('Original stock record not found')

      if (previousItemId === nextItemId) {
        const reduction = purchase.quantity - newQuantity
        if (reduction > 0 && previousStock.available < reduction) {
          throw new Error('Cannot reduce purchase below the quantity already sold')
        }

        await db.stock.update(previousStock.id, {
          total: previousStock.total - purchase.quantity + newQuantity,
          available: previousStock.available - purchase.quantity + newQuantity,
        })
      } else {
        if (previousStock.available < purchase.quantity) {
          throw new Error('Cannot change item because some purchased stock has already been sold')
        }

        await db.stock.update(previousStock.id, {
          total: previousStock.total - purchase.quantity,
          available: previousStock.available - purchase.quantity,
        })

        const nextItem = items.find(item => item.id === nextItemId)
        const nextStock = await db.stock.where('itemId').equals(nextItemId).first()

        if (nextStock) {
          await db.stock.update(nextStock.id, {
            total: nextStock.total + newQuantity,
            available: nextStock.available + newQuantity,
          })
        } else {
          await db.stock.add({
            itemId: nextItemId,
            itemName: nextItem?.name || 'Unknown',
            unit: nextItem?.unit || 'PCS',
            total: newQuantity,
            available: newQuantity,
          })
        }
      }

      await db.purchases.update(purchase.id, {
        accountId: parseInt(form.accountId),
        itemId: nextItemId,
        quantity: newQuantity,
        date: form.date,
        narration: form.narration,
        updatedAt: new Date().toISOString(),
      })

      toast.success('Purchase updated')
      await onSaved()
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Purchase" onClose={onClose}>
      <Select label="Account *" value={form.accountId} onChange={set('accountId')}>
        <option value="">Select account</option>
        {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
      </Select>
      <Select label="Item *" value={form.itemId} onChange={set('itemId')}>
        <option value="">Select item</option>
        {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
      </Select>
      <Input label="Quantity *" type="number" value={form.quantity} onChange={set('quantity')} />
      <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
      <Input label="Narration" value={form.narration} onChange={set('narration')} />
      <div className="flex gap-2 justify-end mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>
    </Modal>
  )
}

export default function Purchase() {
  const { accounts, items, dataVersion, loadAccounts, loadItems, loadStock, notifyDataChanged } = useApp()
  const { verifyPassword } = useAuth()
  const [form, setForm] = useState({ accountId: '', itemId: '', quantity: '', date: today(), narration: '' })
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [deletePurchaseId, setDeletePurchaseId] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)

  useEffect(() => {
    loadAccounts()
    loadItems()
  }, [loadAccounts, loadItems])

  useEffect(() => {
    loadRecent()
  }, [dataVersion])

  async function loadRecent() {
    const purchaseRows = await db.purchases.reverse().limit(10).toArray()
    const withNames = await Promise.all(purchaseRows.map(async purchase => {
      const [account, item] = await Promise.all([db.accounts.get(purchase.accountId), db.items.get(purchase.itemId)])
      return {
        ...purchase,
        accountName: account?.name || 'Unknown',
        itemName: item?.name || 'Unknown',
        unit: item?.unit || 'PCS',
      }
    }))
    setRecent(withNames)
  }

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave() {
    if (!form.accountId || !form.itemId || !form.quantity) return toast.error('Account, item and quantity required')
    const quantity = parseFloat(form.quantity)
    if (isNaN(quantity) || quantity <= 0) return toast.error('Invalid quantity')

    setLoading(true)
    try {
      await db.purchases.add({
        accountId: parseInt(form.accountId),
        itemId: parseInt(form.itemId),
        quantity,
        date: form.date,
        narration: form.narration,
        createdAt: new Date().toISOString(),
      })

      const stockEntry = await db.stock.where('itemId').equals(parseInt(form.itemId)).first()
      if (stockEntry) {
        await db.stock.update(stockEntry.id, {
          total: stockEntry.total + quantity,
          available: stockEntry.available + quantity,
        })
      } else {
        const item = items.find(entry => entry.id === parseInt(form.itemId))
        await db.stock.add({
          itemId: parseInt(form.itemId),
          itemName: item?.name || 'Unknown',
          unit: item?.unit || 'PCS',
          total: quantity,
          available: quantity,
        })
      }

      toast.success('Purchase recorded and stock updated')
      setForm({ accountId: '', itemId: '', quantity: '', date: today(), narration: '' })
      await loadStock()
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const purchase = recent.find(entry => entry.id === deletePurchaseId)
    if (!purchase) {
      setDeletePurchaseId(null)
      return
    }

    try {
      const stockEntry = await db.stock.where('itemId').equals(purchase.itemId).first()
      if (!stockEntry) throw new Error('Stock record not found for this purchase')
      if (stockEntry.available < purchase.quantity) {
        throw new Error('Cannot delete purchase because some of its stock has already been sold')
      }

      await db.stock.update(stockEntry.id, {
        total: stockEntry.total - purchase.quantity,
        available: stockEntry.available - purchase.quantity,
      })
      await db.purchases.delete(deletePurchaseId)
      toast.success('Purchase deleted')
      setDeletePurchaseId(null)
      await loadStock()
      notifyDataChanged()
    } catch (error) {
      toast.error(error.message)
      setDeletePurchaseId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Purchase</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><ShoppingCart size={18} />New Purchase</h2>
          <Select label="Account *" value={form.accountId} onChange={set('accountId')}>
            <option value="">Select account</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </Select>
          <Select label="Item *" value={form.itemId} onChange={set('itemId')}>
            <option value="">Select item</option>
            {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
          </Select>
          <Input label="Quantity *" type="number" placeholder="0" value={form.quantity} onChange={set('quantity')} />
          <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
          <Input label="Narration" placeholder="Notes..." value={form.narration} onChange={set('narration')} />
          <Button onClick={handleSave} loading={loading} className="w-full justify-center">Save Purchase</Button>
        </Card>

        <Card>
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Purchases</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No purchases yet</div>
          ) : (
            <div className="divide-y">
              {recent.map(purchase => (
                <div key={purchase.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{purchase.accountName}</p>
                    <p className="text-xs text-gray-400">
                      {purchase.date} | {purchase.itemName} | {purchase.narration || 'No notes'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      {purchase.quantity} {purchase.unit}
                    </span>
                    <button onClick={() => setEditingPurchase(purchase)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Pencil size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => setDeletePurchaseId(purchase.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {deletePurchaseId && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          onConfirm={handleDelete}
          onCancel={() => setDeletePurchaseId(null)}
        />
      )}
      {editingPurchase && (
        <PurchaseEditModal
          purchase={editingPurchase}
          accounts={accounts}
          items={items}
          onClose={() => setEditingPurchase(null)}
          onSaved={async () => {
            await loadStock()
            notifyDataChanged()
          }}
        />
      )}
    </div>
  )
}
