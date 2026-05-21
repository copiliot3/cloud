import React, { useState, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';

const CATEGORIES = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
  { id: 'privacy', label: 'Privacy & Security', icon: 'lock' },
  { id: 'storage', label: 'Storage', icon: 'database' },
];

const ACCENT_COLORS = [
  { name: 'Blue', value: '#013399' },
  { name: 'Purple', value: '#9c27b0' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Red', value: '#f44336' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Gray', value: '#9e9e9e' },
];

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3fa0f6' },
  { name: 'Yellow', value: '#fdd835' },
  { name: 'Green', value: '#66bb6a' },
  { name: 'Red', value: '#ef5350' },
  { name: 'Purple', value: '#ab47bc' },
  { name: 'Graphite', value: '#78909c' },
];

export default function SettingsModal() {
  const { 
    modal, hideModal, 
    accentColor, setAccentColor, 
    folderColor, setFolderColor,
    enableAnimations, setEnableAnimations,
    toggleCustomColorModal,
    customAccentColors,
    darkMode, setDarkMode
  } = useUIStore();

  const [activeTab, setActiveTab] = useState('appearance');
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const stopDragging = () => setIsDragging(false);

  if (!modal.visible || modal.type !== 'settings') return null;

  const handleClose = (e) => {
    if (e.target.id === 'settings-overlay') hideModal();
  };

  return (
    <div 
      id="settings-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/15 dark:bg-black/45 backdrop-blur-[6px] animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-[850px] h-[600px] glass-menu rounded-[28px] flex overflow-hidden text-black dark:text-zinc-100 animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[240px] h-full bg-white/20 dark:bg-black/15 border-r border-white/20 dark:border-white/5 flex flex-col pt-10 px-3">
          {/* Mac OS Window Controls */}
          <div className="flex gap-1.5 mb-8 px-4 group/lights">
            <button 
              onClick={() => hideModal()}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center text-[8px] font-bold text-red-900/0 group-hover/lights:text-red-900/80 transition-all cursor-pointer"
              title="Close window"
            >
              ×
            </button>
            <button 
              onClick={() => hideModal()}
              className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] flex items-center justify-center text-[8px] font-bold text-amber-900/0 group-hover/lights:text-amber-900/80 transition-all cursor-pointer"
              title="Minimize window"
            >
              -
            </button>
            <button 
              className="w-3.5 h-3.5 rounded-full bg-[#27c93f] flex items-center justify-center text-[8px] font-bold text-green-900/0 group-hover/lights:text-green-900/80 transition-all opacity-50 cursor-not-allowed"
              title="Maximize disabled"
              disabled
            >
              +
            </button>
          </div>

          <div className="relative mb-6 px-3">
            <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[18px] text-black/40 dark:text-zinc-500">search</span>
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full h-8 bg-black/5 dark:bg-white/5 rounded-md pl-9 pr-3 text-[13px] text-black dark:text-zinc-100 outline-none placeholder:text-black/30 dark:placeholder:text-zinc-500"
            />
          </div>

          <nav className="flex flex-col gap-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                  activeTab === cat.id 
                    ? 'text-white font-medium shadow-sm' 
                    : 'text-black/70 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={activeTab === cat.id ? { backgroundColor: accentColor } : {}}
              >
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto mb-6 px-4 py-3 bg-black/5 dark:bg-white/5 rounded-[20px] mx-2 flex items-center gap-3 border border-black/5 dark:border-zinc-800/80">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white text-[11px] font-bold shadow-inner">
              <img src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff" alt="User Profile" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-black/80 dark:text-zinc-200">Administrator</span>
              <span className="text-[9px] text-black/40 dark:text-zinc-500 uppercase tracking-widest font-bold">Local Host</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 h-full overflow-y-auto bg-white/10 dark:bg-black/5 relative">
          <header className="sticky top-0 h-14 flex items-center px-8 bg-white/30 dark:bg-[#0c0c0f]/30 backdrop-blur-xl z-10 border-b border-white/20 dark:border-white/5">
            <h2 className="text-[14px] font-bold text-black/90 dark:text-zinc-200 capitalize tracking-tight">{activeTab}</h2>
          </header>

          <div className="p-8 pt-6">
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-10">
                {/* Appearance Preview Cards */}
                <section>
                  <h3 className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">System Appearance</h3>
                  <div className="flex gap-5">
                    {/* Light Mode Card */}
                    <div 
                      onClick={() => setDarkMode('light')}
                      className="flex flex-col items-center gap-3 flex-1 group cursor-pointer"
                    >
                      <div 
                        className={`w-full aspect-[4/3] rounded-2xl border-2 bg-[#f8fafd] p-3 flex flex-col gap-2 shadow-md overflow-hidden transition-all hover:scale-[1.02] ${
                          darkMode === 'light' ? 'shadow-lg' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ borderColor: darkMode === 'light' ? accentColor : 'transparent' }}
                      >
                        <div className="h-3 w-3/4 bg-black/5 rounded-full" />
                        <div className="flex-1 flex gap-2">
                          <div className="w-10 h-full bg-black/5 rounded-xl" />
                          <div className="flex-1 bg-white rounded-xl shadow-sm border border-black/5" />
                        </div>
                      </div>
                      <span className={`text-[12px] font-semibold transition-colors ${darkMode === 'light' ? 'text-black/90 dark:text-zinc-200 font-bold' : 'text-black/40 dark:text-zinc-500 group-hover:text-black/70'}`}>
                        Light
                      </span>
                    </div>

                    {/* Dark Mode Card */}
                    <div 
                      onClick={() => setDarkMode('dark')}
                      className="flex flex-col items-center gap-3 flex-1 group cursor-pointer"
                    >
                      <div 
                        className={`w-full aspect-[4/3] rounded-2xl border-2 bg-[#1e1e1e] p-3 flex flex-col gap-2 shadow-md overflow-hidden transition-all hover:scale-[1.02] ${
                          darkMode === 'dark' ? 'shadow-lg' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ borderColor: darkMode === 'dark' ? accentColor : 'transparent' }}
                      >
                        <div className="h-3 w-3/4 bg-white/10 rounded-full" />
                        <div className="flex-1 flex gap-2">
                          <div className="w-10 h-full bg-white/10 rounded-xl" />
                          <div className="flex-1 bg-white/5 rounded-xl border border-white/5" />
                        </div>
                      </div>
                      <span className={`text-[12px] font-semibold transition-colors ${darkMode === 'dark' ? 'text-black/90 dark:text-zinc-200 font-bold' : 'text-black/40 dark:text-zinc-500 group-hover:text-black/70'}`}>
                        Dark
                      </span>
                    </div>

                    {/* Auto Mode Card */}
                    <div 
                      onClick={() => setDarkMode('auto')}
                      className="flex flex-col items-center gap-3 flex-1 group cursor-pointer"
                    >
                      <div 
                        className={`w-full aspect-[4/3] rounded-2xl border-2 bg-gradient-to-br from-[#f8fafd] to-[#1e1e1e] shadow-md transition-all hover:scale-[1.02] ${
                          darkMode === 'auto' ? 'shadow-lg' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ borderColor: darkMode === 'auto' ? accentColor : 'transparent' }}
                      >
                        <div className="h-full w-full flex">
                          <div className="w-1/2 h-full bg-white/10 backdrop-blur-sm flex flex-col gap-2 p-3">
                            <div className="h-3 w-full bg-black/5 rounded-full" />
                            <div className="flex-1 flex gap-2">
                              <div className="w-4 h-full bg-black/5 rounded-md" />
                              <div className="flex-1 bg-white rounded-md shadow-sm border border-black/5" />
                            </div>
                          </div>
                          <div className="w-1/2 h-full bg-black/10 flex flex-col gap-2 p-3">
                            <div className="h-3 w-full bg-white/10 rounded-full" />
                            <div className="flex-1 flex gap-2">
                              <div className="w-4 h-full bg-white/10 rounded-md" />
                              <div className="flex-1 bg-white/5 rounded-md border border-white/5" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[12px] font-semibold transition-colors ${darkMode === 'auto' ? 'text-black/90 dark:text-zinc-200 font-bold' : 'text-black/40 dark:text-zinc-500 group-hover:text-black/70'}`}>
                        Auto
                      </span>
                    </div>
                  </div>
                </section>

                <hr className="border-black/5 dark:border-zinc-800 mx-2" />

                {/* Theme Options */}
                <section>
                  <h3 className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">Accent Color</h3>
                  <div 
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDragging}
                    onMouseLeave={stopDragging}
                    className={`bg-white/60 dark:bg-zinc-800/40 rounded-[24px] border border-black/5 dark:border-zinc-800/80 p-4 flex items-center gap-4 shadow-sm overflow-x-auto hide-scrollbar flex-nowrap scroll-smooth cursor-grab ${isDragging ? 'cursor-grabbing active:scale-[0.99] transition-transform' : ''}`}
                  >
                    {/* Default Colors */}
                    {ACCENT_COLORS.map(color => {
                      const bgStyle = `linear-gradient(180deg, ${color.value}, color-mix(in srgb, ${color.value}, black 20%))`;
                      
                      return (
                        <button
                          key={color.name}
                          onClick={() => setAccentColor(color.value)}
                          className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 relative flex shrink-0 items-center justify-center ${
                            accentColor === color.value ? 'ring-4 ring-black/5 dark:ring-white/10' : ''
                          }`}
                          style={{ background: bgStyle }}
                          title={color.name}
                        >
                          {accentColor === color.value && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                          )}
                        </button>
                      );
                    })}

                    {/* Divider if custom colors exist */}
                    {customAccentColors.length > 0 && <div className="w-[1px] h-6 bg-black/10 dark:bg-white/10 shrink-0 mx-1" />}

                    {/* Custom Colors */}
                    {customAccentColors.map((color, idx) => {
                      const bgStyle = `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color}, black 20%))`;
                      return (
                        <button
                          key={`custom-${idx}`}
                          onClick={() => setAccentColor(color)}
                          className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 relative flex shrink-0 items-center justify-center ${
                            accentColor === color ? 'ring-4 ring-black/5 dark:ring-white/10' : ''
                          }`}
                          style={{ background: bgStyle }}
                          title="Custom Color"
                        >
                          {accentColor === color && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                          )}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => toggleCustomColorModal(true)}
                      className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-zinc-700/60 flex shrink-0 items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                      title="Custom Color"
                    >
                      <span className="material-symbols-outlined text-[20px] text-black/40 dark:text-zinc-300">add</span>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">Folders & Interaction</h3>
                  <div className="bg-white/60 dark:bg-zinc-800/40 rounded-[24px] border border-black/5 dark:border-zinc-800/80 divide-y divide-black/5 dark:divide-zinc-800/80 shadow-sm overflow-hidden">
                    <div className="p-5 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-black/80 dark:text-zinc-200">Default Folder Color</span>
                        <span className="text-[11px] text-black/40 dark:text-zinc-500">Global theme for your directory icons</span>
                      </div>
                      <div className="flex gap-2.5">
                        {FOLDER_COLORS.map(color => (
                          <button
                            key={color.name}
                            onClick={() => setFolderColor(color.value)}
                            className={`w-6 h-6 rounded-lg transition-all ${
                              folderColor === color.value 
                                ? 'ring-2 ring-black/10 dark:ring-white/20 scale-110 shadow-md' 
                                : 'hover:scale-105 border border-black/5 dark:border-zinc-700/60'
                            }`}
                            style={{ background: `linear-gradient(180deg, ${color.value}, color-mix(in srgb, ${color.value}, black 20%))` }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="p-5 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-black/80 dark:text-zinc-200">Enable Folder Animations</span>
                        <span className="text-[11px] text-black/40 dark:text-zinc-500">Smooth 3D stacked-page effect on hover</span>
                      </div>
                      <button 
                        onClick={() => setEnableAnimations(!enableAnimations)}
                        className={`w-11 h-6 rounded-full transition-all duration-300 relative shadow-inner ${
                          enableAnimations ? '' : 'bg-black/10 dark:bg-zinc-800'
                        }`}
                        style={{ backgroundColor: enableAnimations ? accentColor : undefined }}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                          enableAnimations ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="flex justify-end pt-4">
                  <button 
                    onClick={() => useUIStore.getState().resetAppearance()}
                    className="px-6 py-2 rounded-xl text-[12px] font-bold text-black/40 dark:text-zinc-500 hover:text-black/80 dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    Reset to Default
                  </button>
                </section>

                <div className="pb-10" />
              </div>
            )}

            {activeTab !== 'appearance' && (
              <div className="flex flex-col items-center justify-center h-[400px] text-black/10 dark:text-white/10">
                <span className="material-symbols-outlined text-[64px] mb-4">design_services</span>
                <p className="text-[14px] font-bold tracking-tight dark:text-zinc-600">Designing this section</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

