/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { db } from '../db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('eassyacc_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading] = useState(false)

  async function signUp(email, password, name) {
    const existing = await db.users.where('email').equals(email).first()
    if (existing) throw new Error('Email already registered')
    const id = await db.users.add({ email, password, name, createdAt: new Date().toISOString() })
    const newUser = { id, email, name }
    localStorage.setItem('eassyacc_user', JSON.stringify(newUser))
    setUser(newUser)
    return newUser
  }

  async function signIn(email, password) {
    const found = await db.users.where('email').equals(email).first()
    if (!found || found.password !== password) throw new Error('Invalid email or password')
    const sessionUser = { id: found.id, email: found.email, name: found.name }
    localStorage.setItem('eassyacc_user', JSON.stringify(sessionUser))
    setUser(sessionUser)
    return sessionUser
  }

  function logout() {
    localStorage.removeItem('eassyacc_user')
    setUser(null)
  }

  // Verify password for delete confirmation
  async function verifyPassword(password) {
    if (!user) return false
    const found = await db.users.get(user.id)
    return found?.password === password
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, logout, verifyPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
