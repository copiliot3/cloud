import useUIStore from '../../stores/useUIStore';

export default function Toast() {
  const toasts = useUIStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            animate-slide-up pointer-events-auto
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
            text-sm font-medium min-w-[280px] max-w-[420px]
            ${toast.type === 'success' ? 'bg-primary-container text-on-primary' : ''}
            ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : ''}
            ${toast.type === 'info' ? 'bg-surface-container-high text-on-surface' : ''}
          `}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
