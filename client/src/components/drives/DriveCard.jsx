import ProgressBar from '../shared/ProgressBar';
import { formatDriveSize } from '../../utils/formatBytes';
import { getDriveIcon } from '../../utils/fileTypes';

export default function DriveCard({ drive, onClick }) {
  const percentUsed = drive.percentUsed || 0;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 p-5 rounded-2xl border border-surface-variant/60
                 bg-surface-container-lowest hover:border-outline-variant hover:shadow-md
                 transition-all duration-300 cursor-pointer text-left w-full hover-lift"
    >
      {/* Drive Icon */}
      <div className="w-12 h-12 rounded-full bg-surface-container-high/60 flex items-center justify-center shrink-0
                      group-hover:bg-primary/10 transition-colors">
        <span className="material-symbols-outlined text-[24px] text-on-surface-variant group-hover:text-primary transition-colors">
          {getDriveIcon(drive.driveType)}
        </span>
      </div>

      {/* Drive Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-on-surface truncate">
            {drive.label || `Local Disk (${drive.letter}:)`}
          </h3>
          <span className="text-xs text-on-surface-variant ml-2 shrink-0">
            {formatDriveSize(drive.freeBytes)} free of {formatDriveSize(drive.totalBytes)}
          </span>
        </div>
        <ProgressBar value={percentUsed} max={100} size="sm" />
      </div>
    </button>
  );
}
