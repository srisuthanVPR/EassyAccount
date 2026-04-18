import Dexie from 'dexie'

export const db = new Dexie('EassyAccDB')

db.version(1).stores({
  users: '++id, email',
  categories: '++id, name',
  banks: '++id, name',
  accounts: '++id, name, category, bank',
  items: '++id, name, unit',
  stock: '++id, itemId',
  transactions: '++id, accountId, type, date',
  purchases: '++id, accountId, itemId, date',
})

db.version(2).stores({
  users: '++id, email',
  categories: '++id, name',
  banks: '++id, name',
  accounts: '++id, name, category, bank',
  items: '++id, name, unit',
  stock: '++id, itemId',
  transactions: '++id, accountId, type, date, mode',
  purchases: '++id, accountId, itemId, date',
  expenses: '++id, date, mode, category',
  cashboxTransactions: '++id, sourceTable, sourceId, sourceType, date, direction',
  bankTransactions: '++id, sourceTable, sourceId, sourceType, date, direction',
}).upgrade(async tx => {
  await tx.table('accounts').toCollection().modify(account => {
    if (typeof account.openingBalance !== 'number') {
      account.openingBalance = Number(account.openingBalance || 0)
    }
  })
})

db.version(3).stores({
  users: '++id, email',
  categories: '++id, name',
  banks: '++id, name',
  accounts: '++id, name, category, bank',
  items: '++id, name, unit',
  stock: '++id, itemId',
  transactions: '++id, accountId, type, date, mode',
  purchases: '++id, accountId, itemId, date',
  expenses: '++id, date, mode, category',
  cashboxTransactions: '++id, sourceTable, sourceId, sourceType, date, direction',
  bankTransactions: '++id, sourceTable, sourceId, sourceType, date, direction',
  bankState: 'key',
}).upgrade(async tx => {
  const bankState = tx.table('bankState')
  const existing = await bankState.get('primary')
  if (!existing) {
    await bankState.put({
      key: 'primary',
      openingBalance: 0,
      createdAt: new Date().toISOString(),
    })
  }
})

export async function seedCategories() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd([
      { name: 'Retail' },
      { name: 'Wholesale' },
      { name: 'Supplier' },
      { name: 'General' },
    ])
  }
}

db.open()
  .then(() => console.log('%cIndexedDB connected: EassyAccDB (v' + db.verno + ')', 'color: green; font-weight: bold'))
  .catch(err => console.error('IndexedDB failed to open:', err))

export async function seedBanks() {
  const count = await db.banks.count()
  if (count === 0) {
    await db.banks.bulkAdd([
      { name: 'Cash' },
      { name: 'State Bank of India' },
      { name: 'HDFC Bank' },
      { name: 'ICICI Bank' },
      { name: 'Axis Bank' },
      { name: 'Punjab National Bank' },
      { name: 'Bank of Baroda' },
      { name: 'Canara Bank' },
      { name: 'Union Bank of India' },
      { name: 'Kotak Mahindra Bank' },
    ])
  }
}

export async function seedSampleData() {
  const hasAccounts = await db.accounts.count()
  const hasTransactions = await db.transactions.count()
  const hasExpenses = await db.expenses.count()

  if (hasAccounts || hasTransactions || hasExpenses) {
    throw new Error('Sample data can only be added to an empty business database')
  }

  const today = new Date()
  const isoDate = offset => {
    const copy = new Date(today)
    copy.setDate(copy.getDate() + offset)
    return copy.toISOString().split('T')[0]
  }

  const [retailCategoryId, wholesaleCategoryId] = await db.categories.bulkAdd([
    { name: 'Retail' },
    { name: 'Wholesale' },
  ], { allKeys: true })

  const accountKeys = await db.accounts.bulkAdd([
    {
      name: 'Arun Stores',
      contact: '9876543210',
      category: 'Retail',
      bank: 'Cash',
      openingBalance: 2500,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Metro Foods',
      contact: '9123456780',
      category: 'Wholesale',
      bank: 'HDFC Bank',
      openingBalance: 5000,
      createdAt: new Date().toISOString(),
    },
  ], { allKeys: true })

  const itemKeys = await db.items.bulkAdd([
    { name: 'Rice', unit: 'KGS' },
    { name: 'Cooking Oil', unit: 'LTR' },
  ], { allKeys: true })

  await db.stock.bulkAdd([
    { itemId: itemKeys[0], itemName: 'Rice', unit: 'KGS', total: 120, available: 90 },
    { itemId: itemKeys[1], itemName: 'Cooking Oil', unit: 'LTR', total: 80, available: 68 },
  ])

  await db.purchases.bulkAdd([
    { accountId: accountKeys[1], itemId: itemKeys[0], quantity: 120, date: isoDate(-12), narration: 'Initial stock load', createdAt: new Date().toISOString() },
    { accountId: accountKeys[1], itemId: itemKeys[1], quantity: 80, date: isoDate(-9), narration: 'Refill oil drums', createdAt: new Date().toISOString() },
  ])

  await db.transactions.bulkAdd([
    {
      accountId: accountKeys[0],
      type: 'sale',
      amount: 4200,
      pricePerUnit: 60,
      quantity: 70,
      itemId: itemKeys[0],
      date: isoDate(-7),
      narration: 'Rice sale invoice #101',
      createdAt: new Date().toISOString(),
    },
    {
      accountId: accountKeys[0],
      type: 'payment',
      amount: 1800,
      mode: 'Cash',
      date: isoDate(-5),
      narration: 'Part payment received',
      createdAt: new Date().toISOString(),
    },
    {
      accountId: accountKeys[1],
      type: 'sale',
      amount: 3600,
      pricePerUnit: 120,
      quantity: 30,
      itemId: itemKeys[1],
      date: isoDate(-4),
      narration: 'Oil canister sale',
      createdAt: new Date().toISOString(),
    },
    {
      accountId: accountKeys[1],
      type: 'payment',
      amount: 2400,
      mode: 'UPI',
      date: isoDate(-2),
      narration: 'UPI collection',
      createdAt: new Date().toISOString(),
    },
  ])

  await db.expenses.bulkAdd([
    {
      amount: 450,
      purpose: 'Packing material',
      date: isoDate(-3),
      mode: 'Cash',
      narration: 'Carry bags and twine',
      category: 'Operations',
      createdAt: new Date().toISOString(),
    },
    {
      amount: 900,
      purpose: 'Fuel reimbursement',
      date: isoDate(-1),
      mode: 'Bank',
      narration: 'Delivery vehicle fuel',
      category: 'Transport',
      createdAt: new Date().toISOString(),
    },
  ])

  console.info('Sample data added with categories', retailCategoryId, wholesaleCategoryId)
}
