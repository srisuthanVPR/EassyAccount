import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, IndianRupee, Package, ReceiptText, Users } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { Button, Card, EmptyState, Input } from '../components/UI'
import { addWorksheetFromObjects, downloadWorkbook } from '../utils/excel'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

function SummaryCard({ icon, label, value, tone = 'blue', subtext }) {
  const Icon = icon
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-violet-50 text-violet-700',
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
}

export default function Reports() {
  const { dataVersion } = useApp()
  const [transactions, setTransactions] = useState([])
  const [purchases, setPurchases] = useState([])
  const [accounts, setAccounts] = useState([])
  const [stock, setStock] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())

  useEffect(() => {
    async function load() {
      const [transactionRows, purchaseRows, accountRows, stockRows] = await Promise.all([
        db.transactions.toArray(),
        db.purchases.toArray(),
        db.accounts.toArray(),
        db.stock.toArray(),
      ])
      setTransactions(transactionRows)
      setPurchases(purchaseRows)
      setAccounts(accountRows)
      setStock(stockRows)
    }

    load()
  }, [dataVersion])

  const filteredTransactions = useMemo(() => {
    return transactions.filter(entry => {
      if (dateFrom && entry.date < dateFrom) return false
      if (dateTo && entry.date > dateTo) return false
      return true
    })
  }, [transactions, dateFrom, dateTo])

  const filteredPurchases = useMemo(() => {
    return purchases.filter(entry => {
      if (dateFrom && entry.date < dateFrom) return false
      if (dateTo && entry.date > dateTo) return false
      return true
    })
  }, [purchases, dateFrom, dateTo])

  const salesTotal = filteredTransactions
    .filter(entry => entry.type === 'sale')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0)

  const paymentsTotal = filteredTransactions
    .filter(entry => entry.type === 'payment')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0)

  const outstandingTotal = salesTotal - paymentsTotal
  const purchaseQuantity = filteredPurchases.reduce((sum, entry) => sum + (entry.quantity || 0), 0)
  const lowStockCount = stock.filter(entry => entry.available <= 10).length

  const customerBalances = useMemo(() => {
    const balanceMap = new Map()

    filteredTransactions.forEach(entry => {
      const current = balanceMap.get(entry.accountId) || { sales: 0, payments: 0 }
      if (entry.type === 'sale') current.sales += entry.amount || 0
      if (entry.type === 'payment') current.payments += entry.amount || 0
      balanceMap.set(entry.accountId, current)
    })

    return [...balanceMap.entries()]
      .map(([accountId, totals]) => {
        const account = accounts.find(entry => entry.id === accountId)
        return {
          accountId,
          name: account?.name || 'Unknown account',
          sales: totals.sales,
          payments: totals.payments,
          balance: totals.sales - totals.payments,
        }
      })
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 8)
  }, [filteredTransactions, accounts])

  const monthlySummary = useMemo(() => {
    const monthMap = new Map()

    filteredTransactions.forEach(entry => {
      const month = entry.date?.slice(0, 7) || 'Unknown'
      const current = monthMap.get(month) || { sales: 0, payments: 0 }
      if (entry.type === 'sale') current.sales += entry.amount || 0
      if (entry.type === 'payment') current.payments += entry.amount || 0
      monthMap.set(month, current)
    })

    return [...monthMap.entries()]
      .map(([month, totals]) => ({
        month,
        sales: totals.sales,
        payments: totals.payments,
        balance: totals.sales - totals.payments,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [filteredTransactions])

  function fmt(amount) {
    return `Rs ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  async function handleExport() {
    if (!filteredTransactions.length && !filteredPurchases.length) {
      toast.error('No report data to export for this range')
      return
    }

    await downloadWorkbook(`EassyAcc_Report_${today()}.xlsx`, async workbook => {
      addWorksheetFromObjects(workbook, 'Summary', [
        {
          From: dateFrom || 'Beginning',
          To: dateTo || 'Today',
          Sales: salesTotal,
          Payments: paymentsTotal,
          Outstanding: outstandingTotal,
          PurchaseQuantity: purchaseQuantity,
          LowStockItems: lowStockCount,
        }
      ])

      addWorksheetFromObjects(workbook, 'Balances', customerBalances.map(entry => ({
        Account: entry.name,
        Sales: entry.sales,
        Payments: entry.payments,
        Balance: entry.balance,
      })))

      addWorksheetFromObjects(workbook, 'Monthly', monthlySummary.map(entry => ({
        Month: entry.month,
        Sales: entry.sales,
        Payments: entry.payments,
        Balance: entry.balance,
      })))
    })
    toast.success('Report exported')
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track dues, transaction performance, and stock pressure.</p>
        </div>
        <Button variant="success" onClick={handleExport}>
          <Download size={16} /> Export Report
        </Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mb-0" />
          <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mb-0" />
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => { setDateFrom(''); setDateTo(today()) }}>
              Reset Range
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <SummaryCard icon={IndianRupee} label="Sales in Range" value={fmt(salesTotal)} tone="blue" />
        <SummaryCard icon={ReceiptText} label="Payments in Range" value={fmt(paymentsTotal)} tone="green" />
        <SummaryCard icon={Users} label="Outstanding" value={fmt(outstandingTotal)} tone="yellow" />
        <SummaryCard icon={Package} label="Purchased Qty" value={purchaseQuantity.toLocaleString('en-IN')} tone="purple" subtext={`${lowStockCount} low-stock items currently`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Top Outstanding Accounts</h2>
          </div>
          {customerBalances.length === 0 ? (
            <EmptyState icon={Users} message="No account balances available for this range." />
          ) : (
            <div className="divide-y">
              {customerBalances.map(entry => (
                <div key={entry.accountId} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{entry.name}</p>
                    <p className="text-xs text-gray-400">
                      Sales {fmt(entry.sales)} | Payments {fmt(entry.payments)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(entry.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <BarChart3 size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">Monthly Transaction Summary</h2>
          </div>
          {monthlySummary.length === 0 ? (
            <EmptyState icon={BarChart3} message="No transaction data found for this range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sales</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payments</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map(entry => (
                    <tr key={entry.month} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-700">{entry.month}</td>
                      <td className="px-4 py-3 text-right text-blue-700 font-medium">{fmt(entry.sales)}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(entry.payments)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(entry.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
