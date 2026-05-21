import { useState, useEffect, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';

export default function CustomColorModal() {
  const { customColorModalVisible, toggleCustomColorModal, setAccentColor, accentColor, addCustomAccentColor } = useUIStore();
  const [tempColor, setTempColor] = useState(accentColor);
  const [active, setActive] = useState(false);
  const colorInputRef = useRef(null);

  const isVisible = customColorModalVisible;

  useEffect(() => {
    if (isVisible) {
      setTempColor(accentColor);
      setTimeout(() => setActive(true), 10);
    } else {
      setActive(false);
    }
  }, [isVisible, accentColor]);

  if (!isVisible && !active) return null;

  const handleClose = () => {
    setActive(false);
    setTimeout(() => toggleCustomColorModal(false), 300);
  };

  const handleApply = () => {
    setAccentColor(tempColor);
    addCustomAccentColor(tempColor);
    handleClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-500 ${
        active ? 'bg-black/15 dark:bg-black/40 backdrop-blur-[6px]' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`
          w-[360px] glass-menu rounded-[28px] text-black dark:text-zinc-100 overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${active ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-12'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 pt-7 pb-3">
          <div className="absolute top-4 left-4 flex gap-1.5 group/lights">
            <button 
              onClick={handleClose}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center text-[8px] font-bold text-red-900/0 group-hover/lights:text-red-900/80 transition-all shadow-sm cursor-pointer"
              title="Close"
            >
              ×
            </button>
          </div>
          <h3 className="text-[17px] font-bold text-black/90 dark:text-zinc-200 mt-1">Custom Color</h3>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <p className="text-[13px] text-black/40 dark:text-zinc-500 mb-6 leading-relaxed">
            Choose a unique accent color for your entire CloudDrive experience.
          </p>

          <div className="flex flex-col gap-6">
            {/* Color Preview */}
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl shadow-inner border border-black/5 dark:border-zinc-800 transition-colors duration-200"
                style={{ background: `linear-gradient(180deg, ${tempColor}, color-mix(in srgb, ${tempColor}, black 20%))` }}
              />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest mb-1">Selected Hex</span>
                <span className="text-[15px] font-mono font-bold text-black/80 dark:text-zinc-200">{tempColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Native Picker Wrapper */}
            <div className="relative group">
              <label className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest block mb-2">Color Picker</label>
              <div 
                onClick={() => colorInputRef.current?.click()}
                className="relative w-full h-14 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-zinc-800/80 overflow-hidden transition-all group-hover:bg-black/10 dark:group-hover:bg-white/10 cursor-pointer flex items-center justify-center gap-3"
              >
                <input 
                  ref={colorInputRef}
                  type="color" 
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="absolute opacity-0 pointer-events-none"
                />
                <div className="w-8 h-8 rounded-full border border-black/10 dark:border-zinc-700 shadow-sm transition-transform group-active:scale-90" style={{ backgroundColor: tempColor }} />
                <span className="text-[13px] font-bold text-black/60 dark:text-zinc-300">Open Color Spectrum</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest">Premium Tones</label>
              <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
                {['#5E5CE6', '#30D158', '#FF9F0A', '#FF375F', '#BF5AF2', '#64D2FF', '#FFD60A'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setTempColor(color)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition-all hover:scale-110 ${tempColor.toUpperCase() === color.toUpperCase() ? 'border-black/20 dark:border-white/30 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleApply}
            className="w-full mt-8 py-4 rounded-2xl text-white text-[15px] font-bold shadow-xl transition-all hover:brightness-110 active:scale-95"
            style={{ background: `linear-gradient(180deg, ${tempColor}, color-mix(in srgb, ${tempColor}, black 20%))` }}
          >
            Apply Accent Color
          </button>
        </div>
      </div>
    </div>
  );
}
