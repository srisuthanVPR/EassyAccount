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

// DB connection health check — visible in browser DevTools console
db.open()
  .then(() => console.log('%c✅ IndexedDB connected: EassyAccDB (v' + db.verno + ')', 'color: green; font-weight: bold'))
  .catch(err => console.error('❌ IndexedDB failed to open:', err))

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
