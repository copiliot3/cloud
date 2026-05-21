import { useState, useEffect } from 'react';
import useUIStore from '../../stores/useUIStore';
import FileIcon from '../files/FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { getFileTypeLabel } from '../../utils/fileTypes';
import { fileApi } from '../../api/fileApi';

export default function PropertiesModal() {
  const { modal, hideModal, accentColor } = useUIStore();
  const [active, setActive] = useState(false);
  const [localItem, setLocalItem] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const isVisible = modal.visible && modal.type === 'properties';

  useEffect(() => {
    if (isVisible && modal.data?.item) {
      setLocalItem(modal.data.item);
      setDetails(null);
      setLoading(true);
      setDownloading(false);
      
      const fetchDetails = async () => {
        try {
          const res = await fileApi.getInfo(modal.data.item.path);
          if (res) setDetails(res);
        } catch (err) {
          console.error("Failed to fetch item info:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchDetails();
      const timer = setTimeout(() => setActive(true), 50);
      return () => clearTimeout(timer);
    } else if (!isVisible) {
      setActive(false);
      const timer = setTimeout(() => {
        setLocalItem(null);
        setDetails(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, modal.data]);

  if (!isVisible && !active) return null;

  const handleClose = () => {
    setActive(false);
    setTimeout(hideModal, 300);
  };

  const handleDownload = () => {
    setDownloading(true);
    // Open download in new tab
    window.open(`/api/files/download?path=${encodeURIComponent(localItem.path)}`, '_blank');
    
    // Reset loading state after a few seconds (once the browser has usually picked up the download)
    setTimeout(() => setDownloading(false), 3000);
  };

  if (!localItem) return null;

  const InfoRow = ({ label, value, multiline = false, color = null }) => (
    <div className={`flex ${multiline ? 'flex-col gap-1' : 'items-start justify-between'} py-2.5 border-b border-black/5 dark:border-zinc-800/80 last:border-0`}>
      <span className="text-[11px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className={`text-[13px] font-medium ${multiline ? 'break-all' : 'text-right truncate max-w-[180px]'} ${color ? '' : 'text-black/80 dark:text-zinc-300'}`} style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  );

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${
        active ? 'bg-black/15 dark:bg-black/40 backdrop-blur-[6px]' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`
          w-[320px] glass-menu rounded-[28px] overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${active ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-12'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Banner Area */}
        <div className="relative h-40 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5 flex flex-col items-center justify-center pt-4">
          <div className="absolute top-4 left-4 flex gap-1.5 group/lights">
            <button 
              onClick={handleClose}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center text-[8px] font-bold text-red-900/0 group-hover/lights:text-red-900/80 transition-all shadow-sm cursor-pointer"
              title="Close"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4 transform transition-transform hover:scale-110 duration-500">
            <FileIcon item={localItem} size="xl" />
          </div>
          <h2 className="px-6 text-[15px] font-bold text-black/80 dark:text-zinc-200 truncate w-full text-center" title={localItem.name}>
            {localItem.name}
          </h2>
        </div>

        {/* Info Content */}
        <div className="px-6 py-4 max-h-[450px] overflow-y-auto custom-scrollbar">
          <section className="mb-6">
            <InfoRow label="Kind" value={localItem.isDirectory ? 'Folder' : getFileTypeLabel(localItem)} />
            
            {localItem.isDirectory ? (
              <InfoRow 
                label="Size" 
                value={loading ? 'Calculating...' : details ? formatBytes(details.size) : 'Calculating...'} 
                color={loading || !details ? accentColor : null}
              />
            ) : (
              <InfoRow label="Size" value={`${formatBytes(localItem.size)} (${localItem.size.toLocaleString()} bytes)`} />
            )}

            {details && details.isDirectory && (
              <InfoRow 
                label="Contains" 
                value={`${details.fileCount || 0} files, ${details.folderCount || 0} folders`} 
              />
            )}

            {!localItem.isDirectory && localItem.extension && (
              <InfoRow label="Extension" value={localItem.extension.toUpperCase()} />
            )}

            <InfoRow label="Where" value={localItem.path} multiline />
            <InfoRow label="Created" value={formatDate(details?.created || localItem.created || localItem.modified)} />
            <InfoRow label="Modified" value={formatDate(details?.modified || localItem.modified)} />
            {details?.accessed && <InfoRow label="Accessed" value={formatDate(details.accessed)} />}
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pb-2">
            <button 
              className="w-full py-3 rounded-2xl text-white text-[13px] font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: accentColor }}
              onClick={handleClose}
            >
              Done
            </button>
            <button 
              className={`
                w-full py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-black/60 dark:text-zinc-400 text-[13px] font-bold transition-all 
                flex items-center justify-center gap-2
                ${downloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-black/10 dark:hover:bg-white/10'}
              `}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black/60 dark:border-t-white/60 rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                `Download ${localItem.isDirectory ? 'Folder' : 'File'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
