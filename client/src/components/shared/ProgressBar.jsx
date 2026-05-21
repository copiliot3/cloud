export default function ProgressBar({ value, max = 100, className = '', size = 'md' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

  return (
    <div className={`w-full ${heights[size]} rounded-full bg-black/5 dark:bg-white/10 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${percent}%`,
          background: 'linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary), white 20%))',
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
}
