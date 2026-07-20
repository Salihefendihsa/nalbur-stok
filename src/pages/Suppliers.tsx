import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, AlertTriangle, Phone, Mail, MapPin, Archive } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import {
  useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  useDeletedSuppliers, useRestoreSupplier,
  type SupplierInput,
} from '@/lib/queries/suppliers'
import { useToast } from '@/store/toast'
import type { Supplier } from '@/types/database'
import { formatDate } from '@/utils/format'

const EMPTY_INPUT: SupplierInput = {
  name: '',
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  tax_no: null,
  notes: null,
}

function nullify(s: string): string | null {
  return s.trim() || null
}

export default function Suppliers() {
  const toast = useToast()
  const { data: suppliers = [], isLoading, error } = useSuppliers()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()
  const restoreMutation = useRestoreSupplier()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierInput>(EMPTY_INPUT)
  const [nameError, setNameError] = useState('')
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data: deletedSuppliers = [], isLoading: loadingDeleted } = useDeletedSuppliers(deletedOpen)

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_INPUT)
    setNameError('')
    setFormOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditTarget(s)
    setForm({ name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email, address: s.address, tax_no: s.tax_no, notes: s.notes })
    setNameError('')
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setNameError('Ad zorunludur'); return }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...form })
        toast.success('Tedarikçi güncellendi.')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Tedarikçi oluşturuldu.')
      }
      setFormOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const target = deleteTarget
      await deleteMutation.mutateAsync(target.id)
      toast.undo(`"${target.name}" silindi.`, async () => {
        try {
          await restoreMutation.mutateAsync(target.id)
          toast.success('Tedarikçi geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRestore(s: Supplier) {
    setRestoringId(s.id)
    try {
      await restoreMutation.mutateAsync(s.id)
      toast.success(`"${s.name}" geri yüklendi.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRestoringId(null)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Tedarikçiler"
        subtitle={`${suppliers.length} tedarikçi`}
        actions={
          <>
            <button
              onClick={() => setDeletedOpen(true)}
              title="Silinenler"
              className="icon-btn"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Yeni Tedarikçi
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '0.5rem' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
            Yükleme hatası: {(error as Error).message}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>Henüz tedarikçi eklenmemiş.</p>
            <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> İlk tedarikçiyi ekle</Button>
          </div>
        ) : (
          <div className="card table-scroll-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Ad', 'Telefon / E-posta', 'Vergi No', 'Eklenme', ''].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Link to={`/tedarikciler/${s.id}`} style={{ margin: 0, fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}>
                        {s.name}
                      </Link>
                      {s.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', color: '#94a3b8' }}>
                          <MapPin style={{ width: '0.75rem', height: '0.75rem' }} />
                          <span style={{ fontSize: '0.75rem' }}>{s.address}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {s.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                            <Phone style={{ width: '0.75rem', height: '0.75rem', color: '#94a3b8' }} />
                            {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                            <Mail style={{ width: '0.75rem', height: '0.75rem', color: '#94a3b8' }} />
                            {s.email}
                          </div>
                        )}
                        {!s.phone && !s.email && <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{s.tax_no ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {formatDate(s.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(s)} className="icon-btn">
                          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="icon-btn icon-btn-danger">
                          <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}
        width="max-w-lg"
      >
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Ad *"
            placeholder="Tedarikçi adı"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError('') }}
            error={nameError}
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
            <Input
              label="Telefon"
              placeholder="+90 5XX XXX XX XX"
              value={form.phone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: nullify(e.target.value) }))}
            />
            <Input
              label="E-posta"
              type="email"
              placeholder="info@example.com"
              value={form.email ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, email: nullify(e.target.value) }))}
            />
          </div>
          <Input
            label="Adres"
            placeholder="Şirket adresi"
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: nullify(e.target.value) }))}
          />
          <Input
            label="Vergi No"
            placeholder="1234567890"
            value={form.tax_no ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, tax_no: nullify(e.target.value) }))}
          />
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
              Notlar
            </label>
            <textarea
              className="input"
              style={{ resize: 'none' }}
              rows={3}
              placeholder="Ek notlar…"
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: nullify(e.target.value) }))}
            />
          </div>
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
        title="Tedarikçiyi Sil"
        width="max-w-sm"
      >
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                "{deleteTarget?.name}" silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Bu tedarikçiye bağlı ürünler etkilenmeyecek, yalnızca tedarikçi kaydı silinecektir.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={handleDelete}>Evet, Sil</Button>
          </div>
        </div>
      </Modal>

      {/* Deleted items */}
      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Tedarikçiler"
        items={deletedSuppliers}
        isLoading={loadingDeleted}
        keyExtractor={(s) => s.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={(s) => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{s.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Silinme: {s.deleted_at ? formatDate(s.deleted_at) : '—'}
            </p>
          </div>
        )}
      />
    </div>
  )
}
