import { useEffect, useState } from 'react'
import { TrendingUp, CreditCard, AlertTriangle, DollarSign, Package, Users } from 'lucide-react'
import { db } from '../db'
import { Card } from '../components/UI'
import { useApp } from '../context/AppContext'

function StatCard({ icon, label, value, color, sub }) {
  const Icon = icon
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard({ onNavigate }) {
  const { dataVersion } = useApp()
  const [stats, setStats] = useState({
    totalSales: 0, totalPayments: 0, pendingBalance: 0,
    totalAccounts: 0, totalItems: 0, lowStockItems: []
  })

  useEffect(() => {
    async function load() {
      const [transactions, accounts, items, stock] = await Promise.all([
        db.transactions.toArray(),
        db.accounts.count(),
        db.items.toArray(),
        db.stock.toArray(),
      ])
      const totalSales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount || 0), 0)
      const totalPayments = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + (t.amount || 0), 0)
      const lowStockItems = stock.filter(s => s.available <= 10)
      setStats({
        totalSales, totalPayments,
        pendingBalance: totalSales - totalPayments,
        totalAccounts: accounts,
        totalItems: items.length,
        lowStockItems
      })
    }
    load()
  }, [dataVersion])

  const fmt = n => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="Total Sales" value={fmt(stats.totalSales)} color="blue" />
        <StatCard icon={CreditCard} label="Total Payments" value={fmt(stats.totalPayments)} color="green" />
        <StatCard icon={DollarSign} label="Pending Balance" value={fmt(stats.pendingBalance)} color="yellow" />
        <StatCard icon={Users} label="Total Accounts" value={stats.totalAccounts} color="purple" />
        <StatCard icon={Package} label="Total Items" value={stats.totalItems} color="blue" />
        {stats.lowStockItems.length > 0 && (
          <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={stats.lowStockItems.length + ' items'} color="red" sub="Stock ≤ 10 units" />
        )}
      </div>

      {stats.lowStockItems.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-700">Low Stock Items</h2>
          </div>
          <div className="space-y-2">
            {stats.lowStockItems.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{s.itemName}</span>
                <span className="text-sm font-medium text-red-600">{s.available} {s.unit} left</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: 'New Sale', page: 'sales', color: 'bg-blue-600' },
          { label: 'New Purchase', page: 'purchase', color: 'bg-green-600' },
          { label: 'New Payment', page: 'payment', color: 'bg-yellow-600' },
          { label: 'View Ledger', page: 'ledger', color: 'bg-purple-600' },
          { label: 'View Reports', page: 'reports', color: 'bg-slate-700' },
        ].map(btn => (
          <button
            key={btn.page}
            onClick={() => onNavigate(btn.page)}
            className={`${btn.color} text-white rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
