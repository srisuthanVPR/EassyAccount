import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

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
        await signIn(form.email, form.password)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">E</div>
          <h1 className="text-2xl font-bold text-gray-800">EassyAcc</h1>
          <p className="text-gray-500 text-sm mt-1">Trading Management System</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <Input label="Full Name" type="text" placeholder="Your name" value={form.name} onChange={set('name')} />
          )}
          <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
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
