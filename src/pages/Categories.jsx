import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Tag } from 'lucide-react'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Card, PasswordConfirmModal, EmptyState } from '../components/UI'
import toast from 'react-hot-toast'

export default function Categories() {
  const { categories, loadCategories, notifyDataChanged } = useApp()
  const { verifyPassword } = useAuth()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadCategories() }, [loadCategories])

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return toast.error('Category name required')
    const duplicate = await db.categories
      .filter(category => (
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.id !== editing?.id
      ))
      .first()
    if (duplicate) return toast.error('A category with this name already exists')
    setLoading(true)
    try {
      if (editing) {
        await db.categories.update(editing.id, { name: trimmedName })
        toast.success('Category updated')
        setEditing(null)
      } else {
        await db.categories.add({ name: trimmedName })
        toast.success('Category added')
      }
      setName('')
      await loadCategories()
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    await db.categories.delete(deleteId)
    toast.success('Category deleted')
    setDeleteId(null)
    await loadCategories()
    notifyDataChanged()
  }

  function startEdit(cat) {
    setEditing(cat)
    setName(cat.name)
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Categories</h1>

      <Card className="p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">{editing ? 'Edit Category' : 'Add Category'}</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Category name (e.g. Wholesale, Retail)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="mb-0 flex-1"
          />
          <Button onClick={handleSave} loading={loading}>
            <Plus size={16} />
            {editing ? 'Update' : 'Add'}
          </Button>
          {editing && <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>}
        </div>
      </Card>

      <Card>
        {categories.length === 0 ? (
          <EmptyState icon={Tag} message="No categories yet. Add one above." />
        ) : (
          <div className="divide-y">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Tag size={14} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(cat)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Pencil size={15} className="text-gray-500" />
                  </button>
                  <button onClick={() => setDeleteId(cat.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {deleteId && (
        <PasswordConfirmModal
          verifyPassword={verifyPassword}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
