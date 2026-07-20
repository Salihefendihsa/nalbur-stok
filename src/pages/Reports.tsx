import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingBag, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, Download,
  BarChart3, PieChart as PieIcon,
} from 'lucide-react'
import Header from '@/components/layout/Header'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_DATA = [
  { ay: 'Şub', alis: 42800, satis: 61200 },
  { ay: 'Mar', alis: 51300, satis: 74500 },
  { ay: 'Nis', alis: 38900, satis: 68800 },
  { ay: 'May', alis: 62400, satis: 91200 },
  { ay: 'Haz', alis: 57100, satis: 83600 },
  { ay: 'Tem', alis: 48600, satis: 77400 },
]

const CATEGORY_DATA = [
  { name: 'Boya & Badana', value: 34, color: '#f97316' },
  { name: 'Hırdavat',      value: 27, color: '#3b82f6' },
  { name: 'Tesisat',       value: 21, color: '#10b981' },
  { name: 'El Aletleri',   value: 12, color: '#8b5cf6' },
  { name: 'Diğer',         value: 6,  color: '#94a3b8' },
]

const TOP_PRODUCTS = [
  { rank: 1, name: 'İç Cephe Boyası 15 Lt',   unit: 'Kova',  qty: 218, revenue: 74_120, trend: +12 },
  { rank: 2, name: 'Ahşap Vidası 3.5×30 (Kutu)', unit: 'Kutu', qty: 192, revenue: 19_584, trend: +8  },
  { rank: 3, name: 'Dış Cephe Boyası 20 Lt',   unit: 'Kova',  qty: 143, revenue: 71_500, trend: +5  },
  { rank: 4, name: 'Çekiç 500g Fiberglas',      unit: 'Adet', qty: 97,  revenue: 11_640, trend: -3  },
  { rank: 5, name: 'Plastik Boru 1/2" 3m',      unit: 'Adet', qty: 84,  revenue: 8_400,  trend: +2  },
]

const LOW_STOCK = [
  { id: 1, name: 'Sızdırmaz Silikon Gri 310ml',  stock: 3,  min: 20, supplier: 'Henkel Türkiye',  unit: 'Adet' },
  { id: 2, name: 'Elektrik Bandı Siyah 10m',      stock: 7,  min: 30, supplier: 'Çetin Elektrik',  unit: 'Rulo' },
  { id: 3, name: 'Çimento Torba 25kg (CEM II)',   stock: 9,  min: 50, supplier: 'Batıçim A.Ş.',    unit: 'Torba' },
  { id: 4, name: 'Dübel+Vida 10mm Set (100lü)',   stock: 4,  min: 25, supplier: 'Fischer TR',      unit: 'Set'  },
  { id: 5, name: 'Keser 1000g (Çift Ağız)',       stock: 2,  min: 10, supplier: 'Kıral El Aleti',  unit: 'Adet' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TL = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
const NUM = new Intl.NumberFormat('tr-TR')

function formatTL(v: number) { return TL.format(v) }
function formatNum(v: number) { return NUM.format(v) }

// custom tooltip for area/bar chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
      padding: '0.625rem 0.875rem', boxShadow: '0 4px 16px rgb(15 23 42 / 0.12)',
      fontSize: '0.8125rem', minWidth: '140px',
    }}>
      <p style={{ margin: '0 0 0.375rem', fontWeight: 700, color: '#0f172a' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#64748b', margin: '0.15rem 0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name}
          </span>
          <strong style={{ color: '#0f172a' }}>{formatTL(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// custom tooltip for donut
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
      padding: '0.5rem 0.875rem', boxShadow: '0 4px 16px rgb(15 23 42 / 0.12)',
      fontSize: '0.8125rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.payload.color, display: 'inline-block' }} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.name}</span>
      </div>
      <div style={{ color: '#64748b', marginTop: '0.15rem' }}>Oran: <strong style={{ color: '#0f172a' }}>%{item.value}</strong></div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub: string
  icon: React.FC<{ style?: React.CSSProperties }>
  trendUp?: boolean
  trendPct?: string
  accentColor: string
  accentBg: string
  delay?: number
}

function KpiCard({ label, value, sub, icon: Icon, trendUp, trendPct, accentColor, accentBg, delay = 0 }: KpiCardProps) {
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
      padding: '1.25rem 1.25rem 1rem',
      boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
      position: 'relative', overflow: 'hidden',
      animation: `fade-in-up 400ms ${delay}ms both ease-out`,
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      {/* top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: accentColor }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
          <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, wordBreak: 'break-word' }}>
            {value}
          </span>
        </div>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem',
          background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: '1.1rem', height: '1.1rem', color: accentColor }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        {trendPct && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
            padding: '0.1rem 0.4rem', borderRadius: '0.375rem',
            fontSize: '0.7rem', fontWeight: 700,
            background: trendUp ? '#f0fdf4' : '#fef2f2',
            color: trendUp ? '#15803d' : '#b91c1c',
          }}>
            <TrendIcon style={{ width: '0.6rem', height: '0.6rem' }} />
            {trendPct}
          </span>
        )}
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</span>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, color = '#64748b' }: { icon: React.FC<{ style?: React.CSSProperties }>; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: '0.875rem', height: '0.875rem', color }} />
      </div>
      <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

type ChartView = 'area' | 'bar'

export default function Reports() {
  const [chartView, setChartView] = useState<ChartView>('area')
  const [activePie, setActivePie] = useState<number | null>(null)

  const currentMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1]
  const prevMonth = MONTHLY_DATA[MONTHLY_DATA.length - 2]
  const netProfit = Math.round((currentMonth.satis - currentMonth.alis) * 0.72)
  const profitPrev = Math.round((prevMonth.satis - prevMonth.alis) * 0.72)
  const profitTrend = (((netProfit - profitPrev) / profitPrev) * 100).toFixed(1)
  const salesTrend = (((currentMonth.satis - prevMonth.satis) / prevMonth.satis) * 100).toFixed(1)

  const totalSalesThisMonth = 143  // mock işlem adedi

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Raporlar"
        subtitle="Satış, stok ve kâr analizleri · Temmuz 2026"
        actions={
          <button
            title="Raporu Dışa Aktar"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', fontSize: '0.8rem', fontWeight: 500,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
              cursor: 'pointer', color: '#475569', transition: 'all 150ms',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
          >
            <Download style={{ width: '0.875rem', height: '0.875rem' }} />
            Dışa Aktar
          </button>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ══════════════════════════════════════════
            1. KPI CARDS
        ══════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          <KpiCard
            label="Aylık Toplam Ciro"
            value={formatTL(currentMonth.satis)}
            sub={`geçen aya göre`}
            icon={TrendingUp}
            trendUp
            trendPct={`+${salesTrend}%`}
            accentColor="#10b981"
            accentBg="#f0fdf4"
            delay={0}
          />
          <KpiCard
            label="Aylık Net Kâr"
            value={formatTL(netProfit)}
            sub="tahmini vergi sonrası"
            icon={TrendingUp}
            trendUp={Number(profitTrend) >= 0}
            trendPct={`${Number(profitTrend) >= 0 ? '+' : ''}${profitTrend}%`}
            accentColor="#3b82f6"
            accentBg="#eff6ff"
            delay={60}
          />
          <KpiCard
            label="Toplam Satış İşlemi"
            value={`${totalSalesThisMonth} işlem`}
            sub="bu ay tamamlanan"
            icon={ShoppingBag}
            trendUp
            trendPct="+9%"
            accentColor="#f97316"
            accentBg="#fff7ed"
            delay={120}
          />
          <KpiCard
            label="Kritik Stok Uyarısı"
            value="10 ürün"
            sub="acil ikmal gerekiyor"
            icon={AlertTriangle}
            trendUp={false}
            trendPct="▲3"
            accentColor="#ef4444"
            accentBg="#fef2f2"
            delay={180}
          />
        </div>

        {/* ══════════════════════════════════════════
            2. CHARTS ROW
        ══════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '0.875rem' }}
          className="charts-grid">
          <style>{`
            @media (max-width: 900px) {
              .charts-grid { grid-template-columns: 1fr !important; }
            }
            @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* ── Area/Bar Chart ── */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
            padding: '1.25rem', boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
            animation: 'fade-in-up 500ms 240ms both ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <SectionTitle icon={BarChart3} title="Alış / Satış Karşılaştırması (Son 6 Ay)" color="#f97316" />
              {/* Toggle */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '0.5rem', padding: '0.175rem' }}>
                {(['area', 'bar'] as ChartView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    style={{
                      padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                      border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                      background: chartView === v ? '#fff' : 'transparent',
                      color: chartView === v ? '#0f172a' : '#94a3b8',
                      boxShadow: chartView === v ? '0 1px 3px rgb(15 23 42 / 0.1)' : 'none',
                      transition: 'all 150ms',
                    }}
                  >
                    {v === 'area' ? 'Alan' : 'Çubuk'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              {chartView === 'area' ? (
                <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSatis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradAlis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={38} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{v}</span>} />
                  <Area type="monotone" dataKey="satis" name="Satış" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#gradSatis)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="alis" name="Alış" stroke="#f97316" strokeWidth={2.5}
                    fill="url(#gradAlis)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              ) : (
                <BarChart data={MONTHLY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={38} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{v}</span>} />
                  <Bar dataKey="satis" name="Satış" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="alis"  name="Alış"  fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* ── Donut Chart ── */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
            padding: '1.25rem', boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
            animation: 'fade-in-up 500ms 320ms both ease-out',
          }}>
            <SectionTitle icon={PieIcon} title="Kategori Bazlı Satış" color="#8b5cf6" />

            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActivePie(index)}
                  onMouseLeave={() => setActivePie(null)}
                  stroke="none"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={activePie === null || activePie === index ? 1 : 0.45}
                      style={{ cursor: 'pointer', transition: 'opacity 150ms' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.625rem' }}>
              {CATEGORY_DATA.map((cat, i) => (
                <div
                  key={cat.name}
                  onMouseEnter={() => setActivePie(i)}
                  onMouseLeave={() => setActivePie(null)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.25rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer',
                    background: activePie === i ? '#f8fafc' : 'transparent',
                    transition: 'background 120ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.775rem', color: '#475569', fontWeight: 500 }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      height: '4px', width: `${cat.value * 1.4}px`, borderRadius: '2px',
                      background: cat.color, opacity: 0.7,
                    }} />
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a', minWidth: '2rem', textAlign: 'right' }}>
                      %{cat.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            3. BOTTOM TABLES
        ══════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.875rem' }}>

          {/* ── Top 5 Products ── */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
            padding: '1.25rem', boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
            animation: 'fade-in-up 500ms 400ms both ease-out',
          }}>
            <SectionTitle icon={TrendingUp} title="En Çok Satan 5 Ürün" color="#10b981" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {/* header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 72px 80px 40px',
                gap: '0.5rem', padding: '0.25rem 0.375rem',
              }}>
                {['#', 'Ürün', 'Miktar', 'Gelir', ''].map((h, i) => (
                  <span key={i} style={{
                    fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: i >= 2 ? 'right' : 'left',
                  }}>{h}</span>
                ))}
              </div>

              {TOP_PRODUCTS.map((p, idx) => (
                <div
                  key={p.rank}
                  style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr 72px 80px 40px',
                    gap: '0.5rem', padding: '0.625rem 0.375rem',
                    borderRadius: '0.5rem', alignItems: 'center',
                    borderTop: idx > 0 ? '1px solid #f8fafc' : 'none',
                    transition: 'background 120ms',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  {/* rank badge */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: idx === 0 ? '#fef9c3' : idx === 1 ? '#f1f5f9' : '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 800,
                    color: idx === 0 ? '#a16207' : idx === 1 ? '#475569' : '#94a3b8',
                  }}>
                    {p.rank}
                  </div>

                  {/* name */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.unit}</div>
                  </div>

                  {/* qty */}
                  <div style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                    {formatNum(p.qty)}
                  </div>

                  {/* revenue */}
                  <div style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>
                    {formatTL(p.revenue)}
                  </div>

                  {/* trend */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    gap: '0.1rem', fontSize: '0.7rem', fontWeight: 700,
                    color: p.trend >= 0 ? '#15803d' : '#b91c1c',
                  }}>
                    {p.trend >= 0
                      ? <ArrowUpRight style={{ width: '0.7rem', height: '0.7rem' }} />
                      : <ArrowDownRight style={{ width: '0.7rem', height: '0.7rem' }} />}
                    {Math.abs(p.trend)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Low Stock Alert ── */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
            padding: '1.25rem', boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
            animation: 'fade-in-up 500ms 480ms both ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <SectionTitle icon={AlertTriangle} title="Kritik Stok Uyarıları" color="#ef4444" />
              <span style={{
                padding: '0.15rem 0.55rem', borderRadius: '999px',
                background: '#fef2f2', color: '#b91c1c',
                fontSize: '0.7rem', fontWeight: 700,
              }}>
                {LOW_STOCK.length} kritik
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {LOW_STOCK.map((item, idx) => {
                const pct = Math.round((item.stock / item.min) * 100)
                const isCritical = pct <= 20
                const isWarn = pct > 20 && pct <= 50
                const barColor = isCritical ? '#ef4444' : isWarn ? '#f97316' : '#f59e0b'
                const badgeBg  = isCritical ? '#fef2f2' : '#fff7ed'
                const badgeTxt = isCritical ? '#b91c1c' : '#c2570a'
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem 0.375rem',
                      borderTop: idx > 0 ? '1px solid #f8fafc' : 'none',
                      transition: 'background 120ms', borderRadius: '0.5rem',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '1.625rem', height: '1.625rem', borderRadius: '0.375rem',
                          background: badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Package style={{ width: '0.8rem', height: '0.8rem', color: badgeTxt }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.supplier}</div>
                        </div>
                      </div>
                      <span style={{
                        padding: '0.175rem 0.55rem', borderRadius: '0.375rem', flexShrink: 0,
                        background: badgeBg, color: badgeTxt,
                        fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                      }}>
                        {item.stock} {item.unit} kaldı
                      </span>
                    </div>

                    {/* progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(pct, 100)}%`,
                          background: barColor, borderRadius: '999px',
                          transition: 'width 600ms ease-out',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, color: badgeTxt, flexShrink: 0, minWidth: '2.5rem', textAlign: 'right' }}>
                        %{pct} / min {item.min}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
