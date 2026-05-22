import useDriveStore from '../../stores/useDriveStore';
import { formatDriveSize } from '../../utils/formatBytes';
import { getDriveIcon } from '../../utils/fileTypes';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { useEffect } from 'react';

export default function DrivesOverview() {
  const { drives, loading, fetchDrives } = useDriveStore();
  const { navigateTo } = useFileStore();
  const { setCurrentView, setActiveNav, accentColor, addToast } = useUIStore();

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleDriveClick = async (drive) => {
    const drivePath = `${drive.letter}:\\`;
    setCurrentView('files');
    setActiveNav('my-files');
    try {
      await navigateTo(drivePath);
    } catch (err) {
      addToast(`Unable to open ${drive.label}: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 px-8 py-4">
        <div className="flex items-center justify-between mb-8 mt-2">
          <div>
            <div className="skeleton h-8 w-48 mb-2"></div>
            <div className="skeleton h-4 w-64"></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-[72px] w-[450px] rounded-[36px]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: accentColor }}>Drives overview</h1>
          <p className="text-[15px] text-on-surface-variant dark:text-zinc-400 mt-1 font-medium">Manage your connected storage locations</p>
        </div>
        <button className="h-9 px-4 bg-surface-container-low dark:bg-zinc-850/50 border border-surface-variant/40 dark:border-zinc-800 rounded-full flex items-center gap-2 text-on-surface dark:text-zinc-200 font-label-md text-[13px] hover:bg-surface-variant dark:hover:bg-zinc-800 transition-colors font-semibold">
          <span className="material-symbols-outlined text-[18px]">add</span>Add Drive
        </button>
      </div>

      {/* Drive Pills */}
      <div className="flex flex-wrap gap-6">
        {drives.map((drive) => {
          const total = drive.totalBytes || 1;
          const used = drive.usedBytes || 0;
          const free = drive.freeBytes || 0;
          const percentage = (used / total) * 100;

          // Provide custom styling based on drive type/name to mimic screenshot roughly
          const isSystem = drive.letter === 'C';
          const pillBg = isSystem ? 'bg-[#f0f4fa] dark:bg-[#1b212f]' : 'bg-white dark:bg-[#1c1c1f]';
          const pillBorder = isSystem ? 'border-[#d0dcf0] dark:border-blue-900/30' : 'border-surface-variant/40 dark:border-zinc-800/80';

          return (
            <div
              key={drive.letter}
              onClick={() => handleDriveClick(drive)}
              className={`flex-1 min-w-[350px] max-w-[500px] h-[72px] ${pillBg} border ${pillBorder} rounded-[36px] px-2 flex items-center cursor-pointer hover:shadow-md dark:hover:shadow-black/50 transition-all group`}
            >
              {/* Icon Circle */}
              <div className="w-14 h-14 rounded-full bg-white dark:bg-[#161618] shadow-sm flex items-center justify-center shrink-0 border border-surface-variant/20 dark:border-zinc-800/40 mr-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]" style={{ color: accentColor }}>
                  {drive.driveType === 3 ? 'hard_drive' : getDriveIcon(drive.driveType)}
                </span>
              </div>

              {/* Middle Section (Name + Progress) */}
              <div className="flex-1 min-w-0 mr-4 flex flex-col justify-center pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-[14px] text-on-surface dark:text-zinc-100 truncate">
                    {drive.label || `Local Disk (${drive.letter}:)`}
                  </h3>
                  <div className="font-medium text-[11px] text-on-surface-variant dark:text-zinc-400 shrink-0">
                    {formatDriveSize(free)} free of {formatDriveSize(total)}
                  </div>
                </div>
                
                {/* Custom Progress Bar inside the card */}
                <div className="w-full h-[6px] bg-surface-variant/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(1, percentage)}%`, backgroundColor: accentColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
