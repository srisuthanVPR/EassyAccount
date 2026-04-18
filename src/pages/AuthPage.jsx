import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp, loadRememberedLogin } = useAuth()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', rememberMe: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadRememberedAuth() {
      const remembered = await loadRememberedLogin()
      if (!remembered) return

      setForm(prev => ({
        ...prev,
        email: remembered.email || '',
        password: remembered.password || '',
        rememberMe: true,
      }))
    }

    loadRememberedAuth()
  }, [loadRememberedLogin])

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill all fields')
    if (mode === 'signup' && !form.name) return toast.error('Name is required')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(form.email, form.password, form.rememberMe)
        toast.success('Welcome back!')
      } else {
        await signUp(form.email, form.password, form.name)
        toast.success('Account created!')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">E</div>
          <h1 className="text-2xl font-bold text-gray-800">EassyAcc</h1>
          <p className="text-gray-500 text-sm mt-1">Trading Management System</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {['signin', 'signup'].map(entryMode => (
            <button
              key={entryMode}
              onClick={() => setMode(entryMode)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === entryMode ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              {entryMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <Input label="Full Name" type="text" placeholder="Your name" value={form.name} onChange={set('name')} />
          )}
          <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          <Input label="Password" type="password" placeholder="Enter password" value={form.password} onChange={set('password')} />
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600 mb-4">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={e => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remember me on this device
          </label>
          <Button type="submit" loading={loading} className="w-full justify-center mt-2">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          All data stored locally on your device
        </p>
      </div>
    </div>
  )
}
