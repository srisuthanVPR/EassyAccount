import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, X } from 'lucide-react'

export function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  const base = 'min-h-11 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  )
}

export function PasswordConfirmModal({
  onConfirm,
  onCancel,
  verifyPassword,
  title = 'Confirm Action',
  message = 'Enter your password to continue',
  confirmLabel = 'Confirm',
  tone = 'danger',
}) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const accents = {
    danger: {
      iconWrap: 'bg-red-100',
      icon: 'text-red-600',
      focus: 'focus:ring-red-500',
      button: 'danger',
    },
    primary: {
      iconWrap: 'bg-blue-100',
      icon: 'text-blue-600',
      focus: 'focus:ring-blue-500',
      button: 'primary',
    },
    warning: {
      iconWrap: 'bg-amber-100',
      icon: 'text-amber-600',
      focus: 'focus:ring-amber-500',
      button: 'warning',
    },
  }

  const accent = accents[tone] || accents.danger

  async function handleConfirm() {
    if (!pwd) return setError('Password is required')

    setLoading(true)
    try {
      const ok = await verifyPassword(pwd)
      if (!ok) {
        setError('Incorrect password')
        setPwd('')
        return
      }

      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${accent.iconWrap}`}>
            <Lock size={18} className={accent.icon} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>

        <input
          type="password"
          className={`w-full px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 mb-1 ${accent.focus} ${error ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Your password"
          value={pwd}
          onChange={event => {
            setPwd(event.target.value)
            setError('')
          }}
          onKeyDown={event => event.key === 'Enter' && handleConfirm()}
          autoFocus
        />
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={accent.button} onClick={handleConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <input
        className={`w-full min-h-11 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea
        className={`w-full min-h-24 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <select
        className={`w-full min-h-11 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${error ? 'border-red-400' : 'border-gray-300'}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  title = 'Please confirm',
  confirmLabel = 'Confirm',
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="warning" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ icon, message, action }) {
  const Icon = icon
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-400 text-center">
      <Icon size={48} className="mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
      {action}
    </div>
  )
}

export function SummaryPill({ icon, label, value, tone = 'blue' }) {
  const Icon = icon
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
  }

  return (
    <div className={`rounded-2xl p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-lg font-bold mt-1">{value}</p>
        </div>
        <Icon size={18} />
      </div>
    </div>
  )
}

export function SuccessChip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle2 size={12} />
      {children}
    </span>
  )
}
