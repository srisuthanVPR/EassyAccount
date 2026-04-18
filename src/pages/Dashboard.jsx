import { useEffect, useState } from 'react'
import { TrendingUp, CreditCard, Wallet, Landmark, Receipt, ChartNoAxesCombined, Users, Package, ArrowRight } from 'lucide-react'
import { Card, EmptyState } from '../components/UI'
import { useApp } from '../context/AppContext'
import { formatCurrency, loadFinancialSnapshot } from '../utils/finance'

function StatCard({ icon, label, value, tone, sub }) {
  const Icon = icon
  const tones = {
    yellow: 'bg-yellow-50 text-yellow-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  )
}

function QuickActionCard({ title, description, icon, tone, onClick }) {
  const Icon = icon
  const tones = {
    yellow: 'from-yellow-400 to-amber-500',
    red: 'from-rose-500 to-red-600',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-3xl bg-gradient-to-br ${tones[tone]} text-white p-5 text-left shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.99]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/80">Quick Action</p>
          <h2 className="text-2xl font-bold mt-2">{title}</h2>
          <p className="text-sm text-white/85 mt-2">{description}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Icon size={24} />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm font-medium">
        Open module <ArrowRight size={16} />
      </div>
    </button>
  )
}

export default function Dashboard({ onNavigate }) {
  const { dataVersion } = useApp()
  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    async function load() {
      setSnapshot(await loadFinancialSnapshot())
    }

    load()
  }, [dataVersion])

  if (!snapshot) {
    return <div className="text-sm text-gray-500">Loading dashboard...</div>
  }

  const lowStockItems = snapshot.stock.filter(item => item.available <= 10)
  const pl = snapshot.totalSales - snapshot.totalExpenses

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Offline business overview with live balances across ledger, cash, bank, and expenses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickActionCard
          title="Sales"
          description="Create a new sale quickly and keep ledger balances updated instantly."
          icon={TrendingUp}
          tone="yellow"
          onClick={() => onNavigate('sales')}
        />
        <QuickActionCard
          title="Expenses"
          description="Record operating expenses and push the amount into cash or bank automatically."
          icon={Receipt}
          tone="red"
          onClick={() => onNavigate('expenses')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Total Sales" value={formatCurrency(snapshot.totalSales)} tone="yellow" />
        <StatCard icon={CreditCard} label="Total Payments" value={formatCurrency(snapshot.totalPayments)} tone="green" />
        <StatCard icon={Receipt} label="Total Expenses" value={formatCurrency(snapshot.totalExpenses)} tone="red" />
        <StatCard icon={Wallet} label="Cashbox Balance" value={formatCurrency(snapshot.cashSummary.balance)} tone="orange" />
        <StatCard icon={Landmark} label="Bank Balance" value={formatCurrency(snapshot.bankSummary.balance)} tone="blue" />
        <StatCard icon={ChartNoAxesCombined} label="Profit / Loss" value={formatCurrency(pl)} tone="slate" sub={pl >= 0 ? 'Current profit' : 'Current loss'} />
        <StatCard icon={Users} label="Accounts" value={snapshot.accounts.length} tone="blue" />
        <StatCard icon={Package} label="Items" value={snapshot.items.length} tone="slate" sub={`${lowStockItems.length} low-stock items`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-800">Top Receivables</h2>
          </div>
          {snapshot.accountSummaries.length === 0 ? (
            <EmptyState icon={Users} message="No accounts available yet." />
          ) : (
            <div className="divide-y">
              {snapshot.accountSummaries
                .sort((left, right) => right.balance - left.balance)
                .slice(0, 6)
                .map(account => (
                  <div key={account.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{account.name}</p>
                      <p className="text-xs text-gray-400">Opening {formatCurrency(account.openingBalance)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${account.balance >= 0 ? 'text-slate-700' : 'text-green-600'}`}>
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-800">Low Stock Alerts</h2>
          </div>
          {lowStockItems.length === 0 ? (
            <EmptyState icon={Package} message="Stock levels look healthy." />
          ) : (
            <div className="divide-y">
              {lowStockItems.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.itemName}</p>
                    <p className="text-xs text-gray-400">Available quantity</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{item.available} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
