/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'
import { db } from '../db'
import { rebuildDerivedData } from '../utils/finance'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [banks, setBanks] = useState([])
  const [items, setItems] = useState([])
  const [stock, setStock] = useState([])
  const [dataVersion, setDataVersion] = useState(0)

  const loadAccounts = useCallback(async () => {
    setAccounts(await db.accounts.toArray())
  }, [])

  const loadCategories = useCallback(async () => {
    setCategories(await db.categories.toArray())
  }, [])

  const loadBanks = useCallback(async () => {
    setBanks(await db.banks.toArray())
  }, [])

  const loadItems = useCallback(async () => {
    setItems(await db.items.toArray())
  }, [])

  const loadStock = useCallback(async () => {
    setStock(await db.stock.toArray())
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([loadAccounts(), loadCategories(), loadBanks(), loadItems(), loadStock()])
  }, [loadAccounts, loadCategories, loadBanks, loadItems, loadStock])

  const notifyDataChanged = useCallback(() => {
    setDataVersion(version => version + 1)
  }, [])

  const refreshAllData = useCallback(async () => {
    await rebuildDerivedData()
    await loadAll()
    notifyDataChanged()
  }, [loadAll, notifyDataChanged])

  const syncFinanceData = useCallback(async () => {
    await rebuildDerivedData()
    await loadAll()
    notifyDataChanged()
  }, [loadAll, notifyDataChanged])

  return (
    <AppContext.Provider value={{
      accounts,
      categories,
      banks,
      items,
      stock,
      dataVersion,
      loadAccounts,
      loadCategories,
      loadBanks,
      loadItems,
      loadStock,
      loadAll,
      notifyDataChanged,
      refreshAllData,
      syncFinanceData,
    }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
