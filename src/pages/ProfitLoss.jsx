import { useEffect, useMemo, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Card, EmptyState, Input } from '../components/UI'
import { useApp } from '../context/AppContext'
import { buildMonthlyProfitLoss, calculateProfitLoss, formatCurrency, todayIso } from '../utils/finance'
import { db } from '../db'

export default function ProfitLoss() {
  const { dataVersion } = useApp()
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(todayIso())

  useEffect(() => {
    async function loadRows() {
      const [transactionRows, expenseRows] = await Promise.all([
        db.transactions.toArray(),
        db.expenses.toArray(),
      ])
      setTransactions(transactionRows)
      setExpenses(expenseRows)
    }

    loadRows()
  }, [dataVersion])

  const summary = useMemo(
    () => calculateProfitLoss(transactions, expenses, startDate, endDate),
    [transactions, expenses, startDate, endDate]
  )

  const monthly = useMemo(
    () => buildMonthlyProfitLoss(transactions, expenses),
    [transactions, expenses]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">P/L (Profit / Loss)</h1>
        <p className="text-sm text-gray-500 mt-1">Profit/Loss = Total Sales - Total Expenses, with monthly and custom-range views.</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mb-0" />
          <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mb-0" />
          <div className="flex items-end">
            <button
              onClick={() => { setStartDate(''); setEndDate(todayIso()) }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-gray-500">Total Sales</p><p className="text-2xl font-bold text-yellow-600 mt-2">{formatCurrency(summary.totalSales)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(summary.totalExpenses)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">Profit / Loss Result</p><p className={`text-2xl font-bold mt-2 ${summary.profitOrLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(summary.profitOrLoss)}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b"><h2 className="font-semibold text-gray-800">Month-wise Summary</h2></div>
          {monthly.length === 0 ? (
            <EmptyState icon={ChartNoAxesCombined} message="No sales or expenses available yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sales</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expenses</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(entry => (
                    <tr key={entry.month} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-700">{entry.month}</td>
                      <td className="px-4 py-3 text-right text-yellow-600 font-medium">{formatCurrency(entry.sales)}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(entry.expenses)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${entry.profitOrLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(entry.profitOrLoss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-800">Summary View</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Sales', amount: summary.totalSales, color: 'bg-yellow-500' },
              { label: 'Expenses', amount: summary.totalExpenses, color: 'bg-red-500' },
            ].map(entry => {
              const max = Math.max(summary.totalSales, summary.totalExpenses, 1)
              const width = `${(entry.amount / max) * 100}%`
              return (
                <div key={entry.label}>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{entry.label}</span>
                    <span>{formatCurrency(entry.amount)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${entry.color}`} style={{ width }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className={`mt-6 rounded-2xl p-4 ${summary.profitOrLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm text-gray-500">Net Result</p>
            <p className={`text-3xl font-bold mt-2 ${summary.profitOrLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(summary.profitOrLoss)}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
