import useUIStore from '../../stores/useUIStore';

export default function SharedBreadcrumb({ breadcrumbs = [], onNavigate = () => {} }) {
  const { accentColor } = useUIStore();

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1c1c1f] rounded-full border border-surface-variant/40 dark:border-zinc-800/80 shadow-sm mx-2">
      {/* Breadcrumb items */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {breadcrumbs.map((breadcrumb, index) => (
          <div key={index} className="flex items-center gap-2 whitespace-nowrap">
            {index > 0 && (
              <span className="material-symbols-outlined text-outline-variant dark:text-zinc-600 text-[16px] flex-shrink-0">
                chevron_right
              </span>
            )}
            <button
              onClick={() => onNavigate(breadcrumb.path)}
              className={`font-medium text-[13px] cursor-pointer transition-colors flex-shrink-0 ${
                index === breadcrumbs.length - 1
                  ? 'font-semibold dark:text-zinc-200'
                  : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
              }`}
              style={{
                color:
                  index === breadcrumbs.length - 1
                    ? accentColor
                    : undefined,
              }}
              onMouseEnter={(e) => {
                if (index !== breadcrumbs.length - 1) {
                  e.target.style.color = accentColor;
                }
              }}
              onMouseLeave={(e) => {
                if (index !== breadcrumbs.length - 1) {
                  e.target.style.color = '';
                }
              }}
            >
              {breadcrumb.label}
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Refresh button */}
      <button
        onClick={() => onNavigate(breadcrumbs[breadcrumbs.length - 1].path)}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors text-on-surface-variant dark:text-zinc-400"
        title="Refresh"
      >
        <span className="material-symbols-outlined text-[18px]">refresh</span>
      </button>
    </div>
  );
}
