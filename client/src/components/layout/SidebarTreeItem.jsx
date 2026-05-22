import { useState, useEffect } from 'react';
import { fileApi } from '../../api/fileApi';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';

export default function SidebarTreeItem({ label, path, isDrive, defaultExpanded = false, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentPath, navigateTo } = useFileStore();
  const { setCurrentView, setActiveNav, accentColor } = useUIStore();

  const isSelected = currentPath && (currentPath === path || currentPath.startsWith(path + '\\'));
  const isDirectlySelected = currentPath === path;

  // Active state: directly selected, OR a parent of the current path
  const isActive = isSelected;
  // Visual highlight: prominent if directly selected or if it's a parent but collapsed
  const isProminent = isDirectlySelected || (isSelected && !isExpanded);

  // Fetch children when expanded
  useEffect(() => {
    if (isExpanded && children.length === 0) {
      const fetchChildren = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fileApi.list(path);
          if (res.items) {
            // Only keep directories
            const dirs = res.items.filter(item => item.isDirectory);
            setChildren(dirs);
          }
        } catch (err) {
          console.error("Failed to fetch folders for sidebar:", err);
          setError(err.message || 'Unable to load folders');
          setChildren([]);
        } finally {
          setLoading(false);
        }
      };
      fetchChildren();
    }
  }, [isExpanded, path, children.length]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    setCurrentView('files');
    setActiveNav('my-files');
    navigateTo(path);
  };

  return (
    <div className="flex flex-col">
      <div 
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
          !isActive ? 'text-on-surface-variant dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5' : ''
        }`}
        style={{ 
          paddingLeft: `${level * 12 + 8}px`,
          backgroundColor: isProminent ? `${accentColor}1A` : isActive ? `${accentColor}0D` : undefined,
          color: isActive ? accentColor : undefined
        }}
        onClick={handleSelect}
      >
        <div 
          className="w-4 h-4 flex items-center justify-center shrink-0 text-outline-variant hover:text-on-surface-variant transition-colors"
          onClick={handleToggle}
        >
          <span className={`material-symbols-outlined text-[14px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            chevron_right
          </span>
        </div>
        
        {isDrive ? (
          <span className="material-symbols-outlined text-[16px] shrink-0">hard_drive</span>
        ) : (
          <span className="material-symbols-outlined text-[16px] shrink-0" style={isDirectlySelected ? { fontVariationSettings: '"FILL" 1' } : {}}>folder</span>
        )}
        
        <span className={`font-medium text-[13px] truncate ${isDirectlySelected ? 'font-semibold' : ''}`}>
          {label}
        </span>
      </div>

      {isExpanded && (
        <div className="flex flex-col relative">
          {loading ? (
            <div 
              className="flex items-center gap-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
            >
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <span className="text-[11px] text-outline-variant">Loading...</span>
            </div>
          ) : error ? (
            <div
              className="text-[11px] text-error px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
            >
              {error}
            </div>
          ) : children.length === 0 ? (
            <div
              className="text-[11px] text-on-surface-variant px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
            >
              No folders found
            </div>
          ) : (
            children.map(child => (
              <SidebarTreeItem 
                key={child.path}
                label={child.name}
                path={child.path}
                isDrive={false}
                level={level + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
