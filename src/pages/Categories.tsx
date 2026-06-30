import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  type CategoryInput,
} from '@/lib/queries/categories'
import { useToast } from '@/store/toast'
import type { Category } from '@/types/database'
import { formatDate } from '@/utils/format'

const EMPTY_INPUT: CategoryInput = { name: '', parent_id: null, sort_order: 0 }

interface CategoryWithChildren extends Category {
  children: Category[]
}

function buildTree(cats: Category[]): CategoryWithChildren[] {
  const roots = cats.filter((c) => c.parent_id === null)
  return roots.map((r) => ({
    ...r,
    children: cats
      .filter((c) => c.parent_id === r.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare('tr')),
  })).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'tr'))
}

export default function Categories() {
  const toast = useToast()
  const { data: categories = [], isLoading, error } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryInput>(EMPTY_INPUT)
  const [nameError, setNameError] = useState('')

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_INPUT)
    setNameError('')
    setFormOpen(true)
  }

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setForm({ name: cat.name, parent_id: cat.parent_id, sort_order: cat.sort_order })
    setNameError('')
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setNameError('Ad zorunludur'); return }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...form })
        toast.success('Kategori güncellendi.')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Kategori oluşturuldu.')
      }
      setFormOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Kategori silindi.')
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const tree = buildTree(categories)
  const rootCategories = categories.filter((c) => c.parent_id === null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Kategoriler"
        subtitle={`${categories.length} kategori`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Yeni Kategori
          </Button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {isLoading ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '0.5rem' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
            Yükleme hatası: {(error as Error).message}
          </div>
        ) : categories.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>Henüz kategori eklenmemiş.</p>
            <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> İlk kategoriyi ekle</Button>
          </div>
        ) : (
          <div className="card">
            {tree.map((root, rootIdx) => (
              <div key={root.id} style={{ borderBottom: rootIdx < tree.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <CategoryRow cat={root} onEdit={openEdit} onDelete={setDeleteTarget} isRoot />
                {root.children.map((child, ci) => (
                  <CategoryRow
                    key={child.id}
                    cat={child}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    indent
                    isLastChild={ci === root.children.length - 1}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Kategori Düzenle' : 'Yeni Kategori'}
        width="max-w-md"
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Kategori Adı *"
            placeholder="Örn: El Aletleri"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError('') }}
            error={nameError}
            autoFocus
          />
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
              Üst Kategori (opsiyonel)
            </label>
            <select
              className="input"
              value={form.parent_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value || null }))}
            >
              <option value="">— Ana Kategori —</option>
              {rootCategories
                .filter((c) => c.id !== editTarget?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <Input
            label="Sıralama"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kategoriyi Sil"
        width="max-w-sm"
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                "{deleteTarget?.name}" silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Alt kategoriler de silinecektir. Bu işlem geri alınamaz.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={handleDelete}>Evet, Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface CatRowProps {
  cat: Category
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
  isRoot?: boolean
  indent?: boolean
  isLastChild?: boolean
}

function CategoryRow({ cat, onEdit, onDelete, isRoot, indent, isLastChild }: CatRowProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', padding: '0.75rem 1rem',
        borderBottom: isRoot || !isLastChild ? '1px solid #f8fafc' : 'none',
        gap: '0.75rem', backgroundColor: indent ? '#fafafa' : undefined,
      }}
    >
      {indent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '1.5rem', color: '#cbd5e1' }}>
          <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: isRoot ? 600 : 400, color: '#0f172a' }}>
          {cat.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
          Eklenme: {formatDate(cat.created_at)} · Sıra: {cat.sort_order}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(cat)}
          style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#64748b' }}
        >
          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
        </button>
        <button
          onClick={() => onDelete(cat)}
          style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer', color: '#dc2626' }}
        >
          <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
        </button>
      </div>
    </div>
  )
}
