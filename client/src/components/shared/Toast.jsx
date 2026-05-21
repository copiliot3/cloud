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
            ${toast.type === 'info' || toast.type === 'loading' ? 'bg-surface-container-high text-on-surface' : ''}
          `}
        >
          {toast.type === 'loading' ? (
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
            </span>
          )}
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
