import { db } from '../db'

export const PAYMENT_MODE_OPTIONS = ['Cash', 'Bank', 'Bank Transfer', 'UPI', 'Cheque']

export function normalizeAmount(value) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

export function formatCurrency(value) {
  return `Rs ${normalizeAmount(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function sortByDateAndTime(entries) {
  return [...entries].sort((left, right) => {
    const leftValue = `${left.date || ''}-${left.createdAt || ''}-${left.id || 0}`
    const rightValue = `${right.date || ''}-${right.createdAt || ''}-${right.id || 0}`
    return leftValue.localeCompare(rightValue)
  })
}

export function getFundingSource(mode) {
  const normalized = String(mode || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'cash') return 'cash'
  if (['bank', 'bank transfer', 'upi', 'cheque'].includes(normalized)) return 'bank'
  return null
}

export function isCashMode(mode) {
  return getFundingSource(mode) === 'cash'
}

export function isBankMode(mode) {
  return getFundingSource(mode) === 'bank'
}

export function getExpenseSource(expense = {}) {
  const normalizedSource = String(expense.source || '').trim().toLowerCase()
  if (normalizedSource === 'cashbox') return 'cashbox'
  if (normalizedSource === 'bank' || normalizedSource === 'bank-account' || normalizedSource === 'bank account') return 'bank'

  const fallback = getFundingSource(expense.paymentMode || expense.mode)
  if (fallback === 'cash') return 'cashbox'
  if (fallback === 'bank') return 'bank'
  return 'cashbox'
}

export function getExpenseSourceLabel(source) {
  return source === 'bank' ? 'Bank Account' : 'Cashbox'
}

export function calculateAccountBalance(account, transactions = []) {
  const openingBalance = normalizeAmount(account?.openingBalance)
  const totals = transactions.reduce((summary, transaction) => {
    if (transaction.type === 'sale') summary.sales += normalizeAmount(transaction.amount)
    if (transaction.type === 'payment') summary.payments += normalizeAmount(transaction.amount)
    return summary
  }, { sales: 0, payments: 0 })

  return {
    openingBalance,
    sales: totals.sales,
    payments: totals.payments,
    balance: openingBalance + totals.sales - totals.payments,
  }
}

export function buildAccountSummaries(accounts = [], transactions = []) {
  const grouped = transactions.reduce((map, transaction) => {
    const current = map.get(transaction.accountId) || []
    current.push(transaction)
    map.set(transaction.accountId, current)
    return map
  }, new Map())

  return accounts.map(account => ({
    ...account,
    ...calculateAccountBalance(account, grouped.get(account.id) || []),
  }))
}

export function buildLedgerRows(transactions = [], openingBalance = 0) {
  let runningBalance = normalizeAmount(openingBalance)

  return sortByDateAndTime(transactions).map(transaction => {
    if (transaction.type === 'sale') runningBalance += normalizeAmount(transaction.amount)
    if (transaction.type === 'payment') runningBalance -= normalizeAmount(transaction.amount)

    return {
      ...transaction,
      balance: runningBalance,
    }
  })
}

export function calculateCashOrBankSummary(entries = []) {
  return entries.reduce((summary, entry) => {
    const amount = normalizeAmount(entry.amount)
    if (entry.direction === 'inflow') summary.inflow += amount
    if (entry.direction === 'outflow') summary.outflow += amount
    summary.balance = summary.inflow - summary.outflow
    return summary
  }, { inflow: 0, outflow: 0, balance: 0 })
}

// Bank balance = opening balance + inflows - outflows.
export function calculateBankAccountSummary(openingBalance = 0, entries = []) {
  const normalizedOpeningBalance = normalizeAmount(openingBalance)
  const movement = calculateCashOrBankSummary(entries)

  return {
    openingBalance: normalizedOpeningBalance,
    inflow: normalizeAmount(movement.inflow),
    outflow: normalizeAmount(movement.outflow),
    currentBalance: normalizedOpeningBalance + normalizeAmount(movement.inflow) - normalizeAmount(movement.outflow),
  }
}

// Cash balance = opening balance + inflows - outflows.
export function calculateCashboxSummary(openingBalance = 0, entries = []) {
  const normalizedOpeningBalance = normalizeAmount(openingBalance)
  const movement = calculateCashOrBankSummary(entries)

  return {
    openingBalance: normalizedOpeningBalance,
    inflow: normalizeAmount(movement.inflow),
    outflow: normalizeAmount(movement.outflow),
    currentBalance: normalizedOpeningBalance + normalizeAmount(movement.inflow) - normalizeAmount(movement.outflow),
  }
}

export function calculateProfitLoss(transactions = [], expenses = [], startDate = '', endDate = '') {
  const inRange = entry => {
    if (startDate && entry.date < startDate) return false
    if (endDate && entry.date > endDate) return false
    return true
  }

  const totalSales = transactions
    .filter(entry => entry.type === 'sale' && inRange(entry))
    .reduce((sum, entry) => sum + normalizeAmount(entry.amount), 0)

  const totalExpenses = expenses
    .filter(inRange)
    .reduce((sum, entry) => sum + normalizeAmount(entry.amount), 0)

  return {
    totalSales,
    totalExpenses,
    profitOrLoss: totalSales - totalExpenses,
  }
}

export function buildMonthlyProfitLoss(transactions = [], expenses = []) {
  const buckets = new Map()

  transactions
    .filter(entry => entry.type === 'sale')
    .forEach(entry => {
      const month = entry.date?.slice(0, 7) || 'Unknown'
      const current = buckets.get(month) || { month, sales: 0, expenses: 0 }
      current.sales += normalizeAmount(entry.amount)
      buckets.set(month, current)
    })

  expenses.forEach(entry => {
    const month = entry.date?.slice(0, 7) || 'Unknown'
    const current = buckets.get(month) || { month, sales: 0, expenses: 0 }
    current.expenses += normalizeAmount(entry.amount)
    buckets.set(month, current)
  })

  return [...buckets.values()]
    .map(entry => ({ ...entry, profitOrLoss: entry.sales - entry.expenses }))
    .sort((left, right) => right.month.localeCompare(left.month))
}

function buildMirrorEntries(transactions = [], expenses = []) {
  const cashEntries = []
  const bankEntries = []

  transactions
    .filter(transaction => transaction.type === 'payment')
    .forEach(transaction => {
      const destination = getFundingSource(transaction.mode)
      if (!destination) return

      const entry = {
        sourceTable: 'transactions',
        sourceId: transaction.id,
        sourceType: 'payment',
        accountId: transaction.accountId || null,
        amount: normalizeAmount(transaction.amount),
        direction: 'inflow',
        date: transaction.date,
        mode: transaction.mode || '',
        narration: transaction.narration || '',
        createdAt: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
      }

      if (destination === 'cash') cashEntries.push(entry)
      if (destination === 'bank') bankEntries.push(entry)
    })

  expenses.forEach(expense => {
    const source = getExpenseSource(expense)
    const destination = source === 'bank' ? 'bank' : 'cash'
    if (!destination) return

    const entry = {
      sourceTable: 'expenses',
      sourceId: expense.id,
      sourceType: 'expense',
      amount: normalizeAmount(expense.amount),
      direction: 'outflow',
      date: expense.date,
      mode: getExpenseSourceLabel(source),
      narration: expense.narration || '',
      purpose: expense.purpose || '',
      category: expense.category || '',
      source,
      createdAt: expense.updatedAt || expense.createdAt || new Date().toISOString(),
    }

    if (destination === 'cash') cashEntries.push(entry)
    if (destination === 'bank') bankEntries.push(entry)
  })

  return { cashEntries, bankEntries }
}

export async function rebuildDerivedData() {
  const [transactions, expenses] = await Promise.all([
    db.transactions.toArray(),
    db.expenses.toArray(),
  ])

  const { cashEntries, bankEntries } = buildMirrorEntries(transactions, expenses)

  await db.transaction('rw', [db.cashboxTransactions, db.bankTransactions], async () => {
    await db.cashboxTransactions.clear()
    await db.bankTransactions.clear()

    if (cashEntries.length) await db.cashboxTransactions.bulkAdd(cashEntries)
    if (bankEntries.length) await db.bankTransactions.bulkAdd(bankEntries)
  })
}

export async function loadFinancialSnapshot() {
  const [accounts, transactions, expenses, cashEntries, bankEntries, items, stock] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.expenses.toArray(),
    db.cashboxTransactions.toArray(),
    db.bankTransactions.toArray(),
    db.items.toArray(),
    db.stock.toArray(),
  ])

  const accountSummaries = buildAccountSummaries(accounts, transactions)
  const cashSummary = calculateCashOrBankSummary(cashEntries)
  const bankSummary = calculateCashOrBankSummary(bankEntries)
  const totalSales = transactions
    .filter(transaction => transaction.type === 'sale')
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0)
  const totalPayments = transactions
    .filter(transaction => transaction.type === 'payment')
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + normalizeAmount(expense.amount), 0)
  const totalReceivable = accountSummaries.reduce((sum, account) => sum + normalizeAmount(account.balance), 0)

  return {
    accounts,
    accountSummaries,
    transactions,
    expenses,
    items,
    stock,
    cashEntries: sortByDateAndTime(cashEntries).reverse(),
    bankEntries: sortByDateAndTime(bankEntries).reverse(),
    cashSummary,
    bankSummary,
    totalSales,
    totalPayments,
    totalExpenses,
    totalReceivable,
  }
}
