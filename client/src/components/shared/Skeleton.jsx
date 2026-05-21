export function SkeletonLine({ width = '100%', height = '16px', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: '6px' }}
    />
  );
}

export function SkeletonDriveCard() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl border border-white/40 dark:border-white/5 bg-white/20 dark:bg-white/5 backdrop-blur-md">
      <div className="skeleton w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-1.5 w-full rounded-full" />
        <div className="skeleton h-3 w-40" />
      </div>
    </div>
  );
}

export function SkeletonFileRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <div className="skeleton w-5 h-5 rounded" />
      <div className="skeleton w-7 h-7 rounded" />
      <div className="skeleton h-4 w-48" />
      <div className="flex-1" />
      <div className="skeleton h-3 w-32" />
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-3 w-16" />
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-2 px-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
          <div className="skeleton w-5 h-5 rounded" />
          <div className="skeleton h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
