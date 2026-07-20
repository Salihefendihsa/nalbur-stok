import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type SearchableSelectOption = {
  value: string
  label: string
  sublabel?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçin…',
  emptyMessage = 'Sonuç bulunamadı',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}
      >
        <span style={{ color: selected ? '#0f172a' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Search style={{ width: '0.8rem', height: '0.8rem', color: '#94a3b8', flexShrink: 0 }} />
            <input
              autoFocus
              className="input"
              style={{ border: 'none', padding: '0.125rem 0', fontSize: '0.8125rem' }}
              placeholder="Ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center' }}>{emptyMessage}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    background: o.value === value ? '#fff7ed' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: '#0f172a',
                  }}
                  onMouseEnter={(e) => {
                    if (o.value !== value) e.currentTarget.style.background = '#f8fafc'
                  }}
                  onMouseLeave={(e) => {
                    if (o.value !== value) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{o.label}</div>
                  {o.sublabel && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{o.sublabel}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
