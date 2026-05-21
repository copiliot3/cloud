import useTaskStore from '../../stores/useTaskStore';
import useUIStore from '../../stores/useUIStore';

export default function TaskManager() {
  const { tasks, isMinimized, toggleMinimized, removeTask, clearCompleted } = useTaskStore();
  const { accentColor, darkMode } = useUIStore();

  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'active');
  const hasActive = activeTasks.length > 0;

  // Window border and background theme
  const windowStyle = darkMode === 'dark'
    ? {
        background: 'rgba(28, 28, 35, 0.85)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }
    : {
        background: 'rgba(244, 244, 246, 0.92)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 20px 45px rgba(31, 38, 135, 0.08)'
      };

  // Card background theme (standard rounded rectangular squircles)
  const cardClassName = darkMode === 'dark'
    ? 'flex flex-col p-3.5 bg-white/5 border border-white/5 mx-2.5 mt-2 rounded-[10px] shadow-sm'
    : 'flex flex-col p-3.5 bg-white border border-black/[0.04] mx-2.5 mt-2 rounded-[10px] shadow-sm';

  return (
    <div 
      className="fixed bottom-6 right-6 z-[100] w-[360px] rounded-[14px] overflow-hidden flex flex-col transition-all duration-300"
      style={{ 
        ...windowStyle, 
        maxHeight: isMinimized ? '44px' : '400px' 
      }}
    >
      
      {/* ============================================== */}
      {/* Header (macOS title style)                     */}
      {/* ============================================== */}
      <div 
        className="h-11 px-4 flex items-center justify-between cursor-pointer shrink-0 select-none border-b border-black/[0.03] dark:border-white/5"
        style={{ backgroundColor: accentColor }}
        onClick={toggleMinimized}
      >
        <div className="flex items-center gap-2 text-white">
          {hasActive ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span className="material-symbols-outlined text-[18px] filled">check_circle</span>
          )}
          <span className="font-bold text-[12.5px] tracking-tight">
            {hasActive ? `${activeTasks.length} operation${activeTasks.length > 1 ? 's' : ''} in progress...` : 'All operations complete'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-white/90">
          {!hasActive && (
            <button 
              onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
              className="w-6 h-6 hover:bg-white/20 rounded-[6px] flex items-center justify-center transition-colors"
              title="Clear completed"
            >
              <span className="material-symbols-outlined text-[16px]">clear_all</span>
            </button>
          )}
          <span className={`material-symbols-outlined text-[18px] transition-transform ${isMinimized ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* ============================================== */}
      {/* Task List (Clean Rounded-lg rectangular cards)  */}
      {/* ============================================== */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto max-h-[340px] pb-3 hide-scrollbar">
          {tasks.map(task => (
            <div key={task.id} className={cardClassName}>
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span 
                    className="material-symbols-outlined text-[18px] shrink-0" 
                    style={{ color: accentColor }}
                  >
                    {task.type === 'upload' ? 'upload' : task.type === 'copy' ? 'content_copy' : 'drive_file_move'}
                  </span>
                  <span className="font-bold text-[12px] text-on-surface dark:text-zinc-250 truncate" title={task.title}>
                    {task.title}
                  </span>
                </div>
                
                {task.status !== 'pending' && task.status !== 'active' && (
                  <button 
                    onClick={() => removeTask(task.id)}
                    className="w-5 h-5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-on-surface-variant/70 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
              
              {/* Progress Bar or Status */}
              {(task.status === 'pending' || task.status === 'active') ? (
                <div className="flex flex-col gap-1 mt-2">
                  <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5 overflow-hidden border border-black/[0.02] dark:border-white/[0.02]">
                    <div 
                      className={`h-full rounded-full ${task.progress > 0 ? 'transition-all duration-300' : 'animate-pulse'}`}
                      style={{ width: task.progress > 0 ? `${task.progress}%` : '100%', backgroundColor: accentColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-on-surface-variant/50 dark:text-zinc-500 uppercase tracking-wider">
                    <span>Processing</span>
                    <span>{task.progress}%</span>
                  </div>
                </div>
              ) : task.status === 'error' ? (
                <div className="text-[11.5px] text-error font-semibold flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  <span className="truncate">{task.error || 'Upload failed due to a network error'}</span>
                </div>
              ) : (
                <div className="text-[11.5px] text-green-600 dark:text-green-500 font-semibold flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-[13px] filled">check_circle</span>
                  <span>Upload completed successfully</span>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
