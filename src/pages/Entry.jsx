import { useEffect, useMemo, useState } from 'react'
import { Users, Package, Trash2, Plus, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Select, Card, PasswordConfirmModal, EmptyState, Modal } from '../components/UI'
import { buildAccountSummaries, formatCurrency } from '../utils/finance'

function AccountForm({ categories, banks, onSaved }) {
  const [form, setForm] = useState({ name: '', contact: '', category: '', bank: '', openingBalance: '' })
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return toast.error('Account name required')

    const duplicate = await db.accounts.filter(account => account.name.toLowerCase() === trimmedName.toLowerCase()).first()
    if (duplicate) return toast.error('An account with this name already exists')

    setLoading(true)
    try {
      await db.accounts.add({
        ...form,
        name: trimmedName,
        openingBalance: Number(form.openingBalance || 0),
        createdAt: new Date().toISOString(),
      })
      setForm({ name: '', contact: '', category: '', bank: '', openingBalance: '' })
      await onSaved()
      toast.success('Account created')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 mb-4">
      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Users size={18} />Create Account</h2>
      <Input label="Account Name *" placeholder="e.g. Ravi Traders" value={form.name} onChange={set('name')} />
      <Input label="Contact Number" placeholder="Phone number" value={form.contact} onChange={set('contact')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Category" value={form.category} onChange={set('category')}>
          <option value="">Select category</option>
          {categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
        </Select>
        <Select label="Bank" value={form.bank} onChange={set('bank')}>
          <option value="">Select bank</option>
          {banks.map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}
        </Select>
      </div>
      <Input label="Initial Amount / Opening Balance" type="number" placeholder="0.00" value={form.openingBalance} onChange={set('openingBalance')} />
      <Button onClick={handleSave} loading={loading}><Plus size={16} />Save Account</Button>
    </Card>
  )
}

function ItemForm({ onSaved }) {
  const [form, setForm] = useState({ name: '', unit: 'KGS' })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return toast.error('Item name required')

    const duplicate = await db.items.filter(item => item.name.toLowerCase() === trimmedName.toLowerCase()).first()
    if (duplicate) return toast.error('An item with this name already exists')

    setLoading(true)
    try {
      const itemId = await db.items.add({ name: trimmedName, unit: form.unit })
      await db.stock.add({ itemId, itemName: trimmedName, unit: form.unit, total: 0, available: 0 })
      setForm({ name: '', unit: 'KGS' })
      await onSaved()
      toast.success('Item created')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 mb-4">
      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={18} />Create Item</h2>
      <Input label="Item Name *" placeholder="e.g. Rice, Oil" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
      <Select label="Unit" value={form.unit} onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}>
        <option value="KGS">KGS</option>
        <option value="LTR">LTR</option>
        <option value="PCS">PCS</option>
        <option value="BOX">BOX</option>
        <option value="BAG">BAG</option>
      </Select>
      <Button onClick={handleSave} loading={loading}><Plus size={16} />Save Item</Button>
    </Card>
  )
}

function AccountEditModal({ account, categories, banks, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account.name || '',
    contact: account.contact || '',
    category: account.category || '',
    bank: account.bank || '',
    openingBalance: String(account.openingBalance || 0),
  })
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return toast.error('Account name required')

    const duplicate = await db.accounts
      .filter(entry => entry.id !== account.id && entry.name.toLowerCase() === trimmedName.toLowerCase())
      .first()
    if (duplicate) return toast.error('An account with this name already exists')

    setLoading(true)
    try {
      await db.accounts.update(account.id, {
        ...form,
        name: trimmedName,
        openingBalance: Number(form.openingBalance || 0),
        updatedAt: new Date().toISOString(),
      })
      await onSaved()
      onClose()
      toast.success('Account updated')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Account" onClose={onClose}>
      <Input label="Account Name *" value={form.name} onChange={set('name')} />
      <Input label="Contact Number" value={form.contact} onChange={set('contact')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Category" value={form.category} onChange={set('category')}>
          <option value="">Select category</option>
          {categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
        </Select>
        <Select label="Bank" value={form.bank} onChange={set('bank')}>
          <option value="">Select bank</option>
          {banks.map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}
        </Select>
      </div>
      <Input label="Opening Balance" type="number" value={form.openingBalance} onChange={set('openingBalance')} />
      <div className="flex gap-2 justify-end mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>
    </Modal>
  )
}

function ItemEditModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ name: item.name || '', unit: item.unit || 'PCS' })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return toast.error('Item name required')

    const duplicate = await db.items.filter(entry => entry.id !== item.id && entry.name.toLowerCase() === trimmedName.toLowerCase()).first()
    if (duplicate) return toast.error('An item with this name already exists')

    setLoading(true)
    try {
      await db.items.update(item.id, {
        name: trimmedName,
        unit: form.unit,
        updatedAt: new Date().toISOString(),
      })

      const stockEntry = await db.stock.where('itemId').equals(item.id).first()
      if (stockEntry) {
        await db.stock.update(stockEntry.id, { itemName: trimmedName, unit: form.unit })
      }

      await onSaved()
      onClose()
      toast.success('Item updated')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Item" onClose={onClose}>
      <Input label="Item Name *" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
      <Select label="Unit" value={form.unit} onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}>
        <option value="KGS">KGS</option>
        <option value="LTR">LTR</option>
        <option value="PCS">PCS</option>
        <option value="BOX">BOX</option>
        <option value="BAG">BAG</option>
      </Select>
      <div className="flex gap-2 justify-end mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>
    </Modal>
  )
}

export default function Entry({ activeTab = 'account' }) {
  const { categories, banks, accounts, items, dataVersion, loadCategories, loadBanks, loadAccounts, loadItems, loadStock, notifyDataChanged } = useApp()
  const { verifyPassword } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [deleteAccId, setDeleteAccId] = useState(null)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadCategories()
    loadBanks()
    loadAccounts()
    loadItems()
  }, [loadAccounts, loadBanks, loadCategories, loadItems])

  useEffect(() => {
    async function loadTransactions() {
      setTransactions(await db.transactions.toArray())
    }

    loadTransactions()
  }, [dataVersion])

  useEffect(() => {
    const sectionId = activeTab === 'item' ? 'item-section' : 'account-section'
    const element = document.getElementById(sectionId)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeTab])

  const accountSummaries = useMemo(
    () => buildAccountSummaries(accounts, transactions),
    [accounts, transactions]
  )

  async function deleteAccount() {
    const transactionCount = await db.transactions.where('accountId').equals(deleteAccId).count()
    const purchaseCount = await db.purchases.where('accountId').equals(deleteAccId).count()
    if (transactionCount || purchaseCount) {
      toast.error('Delete blocked: this account already has transactions or purchases')
      setDeleteAccId(null)
      return
    }

    await db.accounts.delete(deleteAccId)
    setDeleteAccId(null)
    await loadAccounts()
    notifyDataChanged()
    toast.success('Account deleted')
  }

  async function deleteItem() {
    const transactionCount = await db.transactions.where('itemId').equals(deleteItemId).count()
    const purchaseCount = await db.purchases.where('itemId').equals(deleteItemId).count()
    if (transactionCount || purchaseCount) {
      toast.error('Delete blocked: this item is already used in sales or purchases')
      setDeleteItemId(null)
      return
    }

    await db.items.delete(deleteItemId)
    const stockEntry = await db.stock.where('itemId').equals(deleteItemId).first()
    if (stockEntry) await db.stock.delete(stockEntry.id)
    setDeleteItemId(null)
    await Promise.all([loadItems(), loadStock()])
    notifyDataChanged()
    toast.success('Item deleted')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Entry</h1>
        <p className="text-sm text-gray-500 mt-1">Create master data with opening balances so account summaries start from the right number.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div id="account-section">
          <AccountForm categories={categories} banks={banks} onSaved={async () => { await loadAccounts(); notifyDataChanged() }} />
          <Card>
            <div className="p-3 border-b">
              <h3 className="font-semibold text-gray-700 text-sm">Accounts ({accountSummaries.length})</h3>
            </div>
            {accountSummaries.length === 0 ? (
              <EmptyState icon={Users} message="No accounts yet" />
            ) : (
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {accountSummaries.map(account => (
                  <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{account.name}</p>
                      <p className="text-xs text-gray-400">{account.category || 'No category'} {account.contact ? `| ${account.contact}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-1">Opening {formatCurrency(account.openingBalance)} | Current {formatCurrency(account.balance)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingAccount(account)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Pencil size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => setDeleteAccId(account.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div id="item-section">
          <ItemForm onSaved={async () => { await Promise.all([loadItems(), loadStock()]); notifyDataChanged() }} />
          <Card>
            <div className="p-3 border-b">
              <h3 className="font-semibold text-gray-700 text-sm">Items ({items.length})</h3>
            </div>
            {items.length === 0 ? (
              <EmptyState icon={Package} message="No items yet" />
            ) : (
              <div className="divide-y max-h-[28rem] overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingItem(item)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Pencil size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => setDeleteItemId(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {deleteAccId && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          title="Confirm Account Deletion"
          message="Enter your password before deleting this account."
          confirmLabel="Delete Account"
          tone="danger"
          onConfirm={deleteAccount}
          onCancel={() => setDeleteAccId(null)}
        />
      )}

      {deleteItemId && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          title="Confirm Item Deletion"
          message="Enter your password before deleting this item."
          confirmLabel="Delete Item"
          tone="danger"
          onConfirm={deleteItem}
          onCancel={() => setDeleteItemId(null)}
        />
      )}

      {editingAccount && (
        <AccountEditModal
          account={editingAccount}
          categories={categories}
          banks={banks}
          onClose={() => setEditingAccount(null)}
          onSaved={async () => { await loadAccounts(); notifyDataChanged() }}
        />
      )}

      {editingItem && (
        <ItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => { await Promise.all([loadItems(), loadStock()]); notifyDataChanged() }}
        />
      )}
    </div>
  )
}
