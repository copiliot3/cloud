import { useEffect } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import useDriveStore from '../../stores/useDriveStore';
import { formatDriveSize } from '../../utils/formatBytes';
import SidebarTreeItem from './SidebarTreeItem';

export default function Sidebar() {
  const { sidebarOpen, activeNav, setActiveNav, setCurrentView, currentView, showModal, accentColor } = useUIStore();
  const { summary, drives, fetchDrives } = useDriveStore();
  const { navigateTo, currentPath } = useFileStore();

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  // Sync activeNav with current state
  useEffect(() => {
    if (currentView === 'drives' || (currentView === 'files' && currentPath)) {
      if (activeNav !== 'my-files') setActiveNav('my-files');
    } else if (currentView === 'starred') {
      if (activeNav !== 'starred') setActiveNav('starred');
    } else if (currentView === 'recent') {
      if (activeNav !== 'recent') setActiveNav('recent');
    } else if (currentView === 'trash') {
      if (activeNav !== 'trash') setActiveNav('trash');
    }
  }, [currentView, currentPath, activeNav, setActiveNav]);

  const handleNavClick = (id) => {
    setActiveNav(id);
    if (id === 'my-files') {
      setCurrentView('drives');
      navigateTo('');
    } else if (id === 'starred') {
      setCurrentView('starred');
    } else if (id === 'recent') {
      setCurrentView('recent');
    } else if (id === 'trash') {
      setCurrentView('trash');
    }
  };

  const NavLink = ({ id, label, icon, filled = false }) => {
    const isActive = activeNav === id;
    return (
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); handleNavClick(id); }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-full font-label-md text-[15px] transition-all duration-200 ${
          isActive 
            ? 'text-white font-semibold shadow-md' 
            : 'text-on-surface-variant dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        style={isActive ? { backgroundColor: accentColor } : {}}
      >
        <span className="material-symbols-outlined text-[20px]" style={isActive && filled ? { fontVariationSettings: '"FILL" 1' } : {}}>
          {icon}
        </span>
        {label}
      </a>
    );
  };

  return (
    <aside
      className={`
        w-[280px] h-full bg-[#f5f6fa] dark:bg-[#0b0b0c] flex flex-col pt-6 pb-6 overflow-y-auto shrink-0
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? '' : '-ml-[280px]'}
      `}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-8 mb-8 shrink-0">
        <img
          src="/assets/logo-light.png"
          alt="Geoinformatic Services"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Navigation Tabs */}
      <nav className="flex flex-col px-4 gap-2">
        <NavLink id="my-files" label="My Files" icon="folder_open" filled />
        <NavLink id="shared" label="Shared" icon="group" />
        <NavLink id="recent" label="Recent" icon="schedule" />
        <NavLink id="starred" label="Starred" icon="star" />
        <NavLink id="trash" label="Recycle Bin" icon="delete" />
      </nav>

      {/* Drives Tree View */}
      <div className="mt-8 mb-4">
        <h3 className="text-outline-variant font-label-sm text-[11px] uppercase tracking-wider mb-2 px-8 font-semibold">Drives</h3>
        <div className="flex flex-col px-3">
          {drives.map((drive) => (
            <SidebarTreeItem 
              key={drive.letter}
              label={drive.label || `Local Disk (${drive.letter}:)`}
              path={`${drive.letter}:\\`}
              isDrive={true}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto px-4">
        {/* Storage Card */}
        <div className="bg-white dark:bg-[#1c1c1f] rounded-3xl p-5 shadow-sm border border-surface-variant/30 dark:border-zinc-800/50 mb-4">
          <div className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider mb-3">
            Storage
          </div>
          {summary ? (
            <>
              <progress 
                className="liquid-progress w-full h-1.5 rounded-full bg-surface-variant dark:bg-zinc-800 overflow-hidden" 
                max={summary.totalBytes} 
                value={summary.usedBytes}>
              </progress>
              <div className="mt-2 text-[12px] font-medium text-on-surface dark:text-zinc-300">
                {formatDriveSize(summary.usedBytes)} of {formatDriveSize(summary.totalBytes)} used
              </div>
            </>
          ) : (
            <div className="h-1.5 w-full bg-surface-variant rounded-full animate-pulse mb-4"></div>
          )}
          
          <button 
            className="mt-4 w-full py-2.5 rounded-full hover:brightness-90 text-white text-[11px] font-bold tracking-wider transition-all shadow-sm ios-gradient"
          >
            MANAGE STORAGE
          </button>
        </div>

        {/* Footer Tabs */}
        <div className="flex flex-col gap-1 px-2">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); showModal('settings'); }}
            className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-label-md text-[14px] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-label-md text-[14px] transition-all">
            <span className="material-symbols-outlined text-[20px]">help</span>
            Support
          </a>
        </div>
      </div>
    </aside>
  );
}
