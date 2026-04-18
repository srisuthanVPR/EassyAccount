import { useState } from 'react'
import { Download, Upload, Database } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { Button, Card } from '../components/UI'
import toast from 'react-hot-toast'

export default function Backup() {
  const { refreshAllData } = useApp()
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const [users, accounts, categories, banks, items, stock, transactions, purchases, expenses, cashboxTransactions, bankTransactions] = await Promise.all([
        db.users.toArray(),
        db.accounts.toArray(),
        db.categories.toArray(),
        db.banks.toArray(),
        db.items.toArray(),
        db.stock.toArray(),
        db.transactions.toArray(),
        db.purchases.toArray(),
        db.expenses.toArray(),
        db.cashboxTransactions.toArray(),
        db.bankTransactions.toArray(),
      ])
      const backup = {
        version: 2,
        users,
        accounts,
        categories,
        banks,
        items,
        stock,
        transactions,
        purchases,
        expenses,
        cashboxTransactions,
        bankTransactions,
        exportedAt: new Date().toISOString()
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EassyAcc_Backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exported!')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) throw new Error('Invalid backup file')

      await db.transaction('rw', [db.users, db.accounts, db.categories, db.banks, db.items, db.stock, db.transactions, db.purchases, db.expenses, db.cashboxTransactions, db.bankTransactions], async () => {
        await db.users.clear()
        await db.accounts.clear(); await db.categories.clear(); await db.banks.clear()
        await db.items.clear(); await db.stock.clear(); await db.transactions.clear(); await db.purchases.clear()
        await db.expenses.clear(); await db.cashboxTransactions.clear(); await db.bankTransactions.clear()
        if (data.users?.length) await db.users.bulkAdd(data.users)
        if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts)
        if (data.categories?.length) await db.categories.bulkAdd(data.categories)
        if (data.banks?.length) await db.banks.bulkAdd(data.banks)
        if (data.items?.length) await db.items.bulkAdd(data.items)
        if (data.stock?.length) await db.stock.bulkAdd(data.stock)
        if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions)
        if (data.purchases?.length) await db.purchases.bulkAdd(data.purchases)
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses)
        if (data.cashboxTransactions?.length) await db.cashboxTransactions.bulkAdd(data.cashboxTransactions)
        if (data.bankTransactions?.length) await db.bankTransactions.bulkAdd(data.bankTransactions)
      })
      await refreshAllData()
      toast.success('Data restored successfully!')
    } catch (err) {
      toast.error('Restore failed: ' + err.message)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Backup & Restore</h1>
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl"><Download size={22} className="text-blue-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Export Backup</h2>
              <p className="text-sm text-gray-500">Download all data as JSON</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Exports all accounts, transactions, stock, and settings to a JSON file you can save anywhere.
          </p>
          <Button onClick={handleExport} loading={loading} className="w-full justify-center">
            <Download size={16} /> Download Backup
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-xl"><Upload size={22} className="text-green-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Restore Backup</h2>
              <p className="text-sm text-gray-500">Import data from JSON file</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            ⚠️ This will replace ALL existing data. Make sure to export a backup first.
          </p>
          <label className="block">
            <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={loading} />
            <span className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''} bg-green-600 text-white hover:bg-green-700`}>
              <Upload size={16} /> Choose Backup File
            </span>
          </label>
        </Card>

        <Card className="p-6 sm:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            <Database size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-700">Storage Info</h2>
          </div>
          <p className="text-sm text-gray-500">
            All data is stored in your browser's IndexedDB. It persists across sessions but is device-specific.
            Use the backup feature to transfer data between devices or as a safety net.
          </p>
        </Card>
      </div>
    </div>
  )
}
