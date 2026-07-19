export default function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-3 w-56" />
        </div>
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-32 mt-2" />
            <div className="skeleton h-3 w-20 mt-1" />
          </div>
        ))}
      </div>
      <div className="card p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
