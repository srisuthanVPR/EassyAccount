import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Landmark } from 'lucide-react'
import { Card, EmptyState } from '../components/UI'
import { useApp } from '../context/AppContext'
import { calculateCashOrBankSummary, formatCurrency, sortByDateAndTime } from '../utils/finance'
import { db } from '../db'

export default function BankAccount() {
  const { dataVersion } = useApp()
  const [entries, setEntries] = useState([])

  useEffect(() => {
    async function loadEntries() {
      setEntries(sortByDateAndTime(await db.bankTransactions.toArray()).reverse())
    }

    loadEntries()
  }, [dataVersion])

  const summary = calculateCashOrBankSummary(entries)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Bank Account</h1>
        <p className="text-sm text-gray-500 mt-1">UPI and bank-linked financial movement with live inflow and outflow history.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-gray-500">Current Bank Balance</p><p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(summary.balance)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">Bank Inflow</p><p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(summary.inflow)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">Bank Outflow</p><p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(summary.outflow)}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b"><h2 className="font-semibold text-gray-800">Transaction History</h2></div>
        {entries.length === 0 ? (
          <EmptyState icon={Landmark} message="No bank transactions recorded yet." />
        ) : (
          <div className="divide-y">
            {entries.map(entry => (
              <div key={`${entry.sourceTable}-${entry.sourceId}`} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center ${entry.direction === 'inflow' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {entry.direction === 'inflow' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{entry.sourceType === 'payment' ? 'Payment Receipt' : entry.purpose || 'Expense'}</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.date} | {entry.mode}</p>
                    {entry.narration && <p className="text-xs text-gray-400 mt-1">{entry.narration}</p>}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${entry.direction === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.direction === 'inflow' ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
