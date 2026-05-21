import { useState, useEffect, useRef, useCallback } from 'react';
import useUIStore from '../../stores/useUIStore';
import useFileStore from '../../stores/useFileStore';
import useTaskStore from '../../stores/useTaskStore';
import { fileApi } from '../../api/fileApi';
import { driveApi } from '../../api/driveApi';
import { formatBytes } from '../../utils/formatBytes';
import { getFileType } from '../../utils/fileTypes';

export default function UploadModal() {
  const { modal, hideModal, addToast, accentColor, darkMode } = useUIStore();
  const { currentPath, refresh } = useFileStore();
  
  // Modal visibility
  const isOpen = modal.visible && modal.type === 'upload';
  
  // Window states (macOS style options: Close and Maximize only)
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Staging state
  const [stagedFiles, setStagedFiles] = useState([]);
  const [targetPath, setTargetPath] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Explorer state (Finder sidebar navigator)
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerParent, setExplorerParent] = useState(null);
  const [explorerItems, setExplorerItems] = useState([]);
  const [explorerDrives, setExplorerDrives] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  
  // Upload execution state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTotalProgress, setUploadTotalProgress] = useState(0);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Initialize paths when modal opens
  useEffect(() => {
    if (isOpen) {
      const activePath = currentPath || 'C:\\';
      setTargetPath(activePath);
      setExplorerPath(activePath);
      setStagedFiles([]);
      setIsUploading(false);
      setIsMaximized(false);
      setUploadTotalProgress(0);
    }
  }, [isOpen, currentPath]);

  // Load explorer directories and drives
  const loadExplorerContents = useCallback(async (path) => {
    setExplorerLoading(true);
    try {
      const driveData = await driveApi.getAll();
      setExplorerDrives(driveData.drives || []);

      if (!path) {
        setExplorerItems([]);
        setExplorerParent(null);
      } else {
        const data = await fileApi.list(path);
        const directories = (data.items || []).filter(item => item.isDirectory);
        setExplorerItems(directories);
        setExplorerParent(data.parent);
      }
    } catch (err) {
      addToast(err.message || 'Error loading directories', 'error');
    } finally {
      setExplorerLoading(false);
    }
  }, [addToast]);

  // Fetch directories on path changes
  useEffect(() => {
    if (isOpen) {
      loadExplorerContents(explorerPath);
    }
  }, [isOpen, explorerPath, loadExplorerContents]);

  if (!isOpen) return null;

  // File selection
  const handleFileSelect = (e) => {
    const files = [...e.target.files];
    if (files.length) {
      addFilesToStage(files);
    }
  };

  // Folder selection (via webkitdirectory selector)
  const handleFolderSelect = (e) => {
    const files = [...e.target.files];
    if (files.length) {
      const filesWithPaths = files.map(file => {
        // Staged files from a webkitdirectory selector already have a 'webkitRelativePath' property
        Object.defineProperty(file, 'relativePath', {
          value: file.webkitRelativePath || file.name,
          writable: false
        });
        return file;
      });
      addFilesToStage(filesWithPaths);
    }
  };

  // Recursive folder traversal for drag & drop uploads
  const traverseDirectoryEntry = async (entry, path = '') => {
    const filesList = [];
    
    const readEntry = async (item, relativePath) => {
      if (item.isFile) {
        const file = await new Promise((resolve) => item.file(resolve));
        Object.defineProperty(file, 'relativePath', {
          value: relativePath + file.name,
          writable: false
        });
        filesList.push(file);
      } else if (item.isDirectory) {
        const reader = item.createReader();
        const entries = await new Promise((resolve) => {
          reader.readEntries(resolve);
        });
        for (const subEntry of entries) {
          await readEntry(subEntry, relativePath + item.name + '/');
        }
      }
    };

    await readEntry(entry, path);
    return filesList;
  };

  // File drag & drop staged files
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isUploading) return;
    
    const items = e.dataTransfer.items;
    if (items && items.length) {
      const allFiles = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            const files = await traverseDirectoryEntry(entry);
            allFiles.push(...files);
          }
        }
      }
      if (allFiles.length) {
        addFilesToStage(allFiles);
      }
    } else {
      const files = [...e.dataTransfer.files];
      if (files.length) {
        addFilesToStage(files);
      }
    }
  };

  const addFilesToStage = (files) => {
    setStagedFiles((prev) => {
      const existingKeys = new Set(prev.map(f => (f.relativePath || f.name) + f.size));
      const newFiles = files.filter(f => !existingKeys.has((f.relativePath || f.name) + f.size));
      return [...prev, ...newFiles];
    });
  };

  const removeStagedFile = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllStaged = () => {
    setStagedFiles([]);
  };

  // Sidebar explorer paths
  const handleExplorerClick = (folderPath) => {
    setExplorerPath(folderPath);
  };

  const handleExplorerGoUp = () => {
    if (explorerParent) {
      setExplorerPath(explorerParent);
    } else {
      const parts = explorerPath.split('\\').filter(Boolean);
      if (parts.length > 1) {
        parts.pop();
        setExplorerPath(parts.join('\\'));
      } else {
        setExplorerPath('');
      }
    }
  };

  const handleConfirmExplorerPath = () => {
    setTargetPath(explorerPath);
    addToast(`Upload destination set to: ${explorerPath.split('\\').pop() || explorerPath}`, 'info');
  };

  // Upload actions
  const handleStartUpload = async () => {
    if (!stagedFiles.length || !targetPath) return;

    setIsUploading(true);
    setUploadTotalProgress(0);

    const { addTask, updateTask, completeTask, failTask } = useTaskStore.getState();
    const taskId = `upload-${Date.now()}`;

    addTask({
      id: taskId,
      type: 'upload',
      title: `Uploading ${stagedFiles.length} item(s) to ${targetPath.split('\\').pop() || targetPath}`
    });

    try {
      await fileApi.upload(targetPath, stagedFiles, (progress) => {
        setUploadTotalProgress(progress);
        updateTask(taskId, { status: 'active', progress });
      });
      
      completeTask(taskId);
      addToast(`${stagedFiles.length} item(s) uploaded successfully!`);
      refresh();
      
      setTimeout(() => {
        hideModal();
      }, 1500);

    } catch (err) {
      setIsUploading(false);
      failTask(taskId, err.message);
      addToast(err.message || 'Upload failed', 'error');
    }
  };

  // Distribute total progress to file loaders sequentially
  const getFileProgress = (index) => {
    const N = stagedFiles.length;
    if (N === 0) return 0;
    if (uploadTotalProgress === 100) return 100;
    
    const fraction = 100 / N;
    const startProgress = index * fraction;
    const endProgress = (index + 1) * fraction;
    
    if (uploadTotalProgress <= startProgress) return 0;
    if (uploadTotalProgress >= endProgress) return 100;
    
    const itemProgress = ((uploadTotalProgress - startProgress) / fraction) * 100;
    return Math.round(itemProgress);
  };

  // Sidebar Space Grey Theme (matches 2nd screenshot sidebar)
  const sidebarStyle = darkMode === 'dark'
    ? {
        background: 'linear-gradient(180deg, rgba(28, 28, 35, 0.5) 0%, rgba(18, 18, 23, 0.7) 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)'
      }
    : {
        background: 'linear-gradient(180deg, rgba(245, 245, 250, 0.6) 0%, rgba(235, 235, 240, 0.7) 100%)',
        borderRight: '1px solid rgba(0, 0, 0, 0.04)'
      };

  // Custom macOS Document/File representation
  const renderMacFileIcon = (fileName, color) => {
    const ext = fileName.split('.').pop().toUpperCase() || 'FILE';
    return (
      <div className="relative w-8 h-10 bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 rounded-[6px] shadow-sm flex flex-col justify-between overflow-hidden shrink-0">
        {/* Page folded corner */}
        <div className="absolute top-0 right-0 w-2 h-2 bg-black/10 dark:bg-white/15 rounded-bl-[2px]" />
        
        {/* Extension title */}
        <span className="text-[8px] font-extrabold text-zinc-500 dark:text-zinc-400 text-center w-full mt-1.5 tracking-tighter">
          {ext.slice(0, 4)}
        </span>
        
        {/* Accent strip bar */}
        <div className="h-1 w-full" style={{ backgroundColor: color || accentColor }} />
      </div>
    );
  };

  // Beautiful SVG custom macOS metallic folder
  const renderMacFolderIcon = (isSelected) => {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M4 6C4 4.89543 4.89543 4 6 4H10.4142C10.9446 4 11.4533 4.21071 11.8284 4.58579L13.4142 6.17157C13.7893 6.54664 14.298 6.75736 14.8284 6.75736H18C19.1046 6.75736 20 7.66193 20 8.7665V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" 
              fill={isSelected ? '#ffffff' : (accentColor || '#0a84ff')} 
              className="transition-colors duration-200"
        />
        <path d="M4 8.5C4 7.94772 4.44772 7.5 5 7.5H19C19.5523 7.5 20 7.94772 20 8.5V18C20 18.5523 19.5523 19 19 19H5C4.44772 19 4 18.5523 4 18V8.5Z" 
              fill={isSelected ? '#ffffff' : (accentColor || '#0a84ff')} 
              opacity="0.8"
              className="transition-colors duration-200"
        />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center animate-fade-in p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/45 backdrop-blur-[6px]" onClick={isUploading ? null : hideModal} />

      {/* macOS Finder-style Window (Less round: rounded-[20px]) */}
      <div 
        className={`relative flex flex-col rounded-[20px] glass-menu overflow-hidden text-on-surface dark:text-zinc-200 transition-all duration-300 ${
          isMaximized 
            ? 'w-[96vw] h-[92vh] max-w-none' 
            : 'w-full max-w-[820px] h-[500px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================== */}
        {/* macOS Traffic Lights Header & Title Bar        */}
        {/* ============================================== */}
        <div className="h-11 flex items-center justify-between px-5 shrink-0 border-b border-black/[0.04] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.005]">
          {/* Traffic Lights: Red, Yellow, Green */}
          <div className="flex items-center gap-1.5 group/lights">
            <button 
              onClick={hideModal}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center text-[8px] font-bold text-red-900/0 group-hover/lights:text-red-900/80 transition-all cursor-pointer"
              title="Close window"
            >
              ×
            </button>
            <button 
              onClick={hideModal}
              className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] flex items-center justify-center text-[8px] font-bold text-amber-900/0 group-hover/lights:text-amber-900/80 transition-all cursor-pointer"
              title="Minimize window"
            >
              -
            </button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-3.5 h-3.5 rounded-full bg-[#27c93f] flex items-center justify-center text-[8px] font-bold text-green-900/0 group-hover/lights:text-green-900/80 transition-all cursor-pointer"
              title="Maximize / Restore window"
            >
              +
            </button>
          </div>

          {/* Window Center Title & Target Destination */}
          <div className="flex items-center gap-2 max-w-[60%] overflow-hidden">
            <span className="text-[11.5px] font-bold tracking-tight text-on-surface/80 dark:text-zinc-350">
              Upload Target: 
            </span>
            <span 
              className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold truncate shadow-sm transition-all"
              style={{ backgroundColor: `${accentColor}1A`, color: accentColor, border: `1px solid ${accentColor}33` }}
              title={targetPath}
            >
              {targetPath.split('\\').pop() || targetPath || 'Select Folder'}
            </span>
          </div>

          {/* Right Header Space */}
          <div className="flex items-center gap-2">
            {stagedFiles.length > 0 && !isUploading && (
              <button
                onClick={clearAllStaged}
                className="text-[11px] font-bold hover:underline transition-all"
                style={{ color: accentColor }}
              >
                Clear
              </button>
            )}
            <div className="w-5"></div>
          </div>
        </div>

        {/* ============================================== */}
        {/* Finder Split-View Two-Column Layout            */}
        {/* ============================================== */}
        <div className="flex-1 flex min-h-0 relative">
          
          {/* -------------------------------------------- */}
          {/* Left Column: Simplified Sidebar (macOS Space Grey) */}
          {/* -------------------------------------------- */}
          {!isUploading && (
            <div 
              className="w-[210px] shrink-0 flex flex-col p-3 overflow-y-auto"
              style={sidebarStyle}
            >
              
              {/* Category: Shortcuts */}
              <div className="flex flex-col gap-0.5 mb-3.5">
                <span className="text-[9px] font-bold tracking-wider text-on-surface-variant/40 dark:text-zinc-500 uppercase px-2 mb-1">
                  Favorites
                </span>
                <button
                  onClick={() => {
                    const activePath = currentPath || 'C:\\';
                    setExplorerPath(activePath);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-[12px] font-bold transition-all ${
                    explorerPath === currentPath 
                      ? 'bg-black/5 dark:bg-white/5' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={explorerPath === currentPath ? { color: accentColor } : {}}
                >
                  <span className="material-symbols-outlined text-[15px]">near_me</span>
                  <span className="truncate">Current Folder</span>
                </button>
              </div>

              {/* Category: Connected Volumes */}
              <div className="flex flex-col gap-0.5 mb-3.5">
                <span className="text-[9px] font-bold tracking-wider text-on-surface-variant/40 dark:text-zinc-500 uppercase px-2 mb-1">
                  Volumes
                </span>
                {explorerDrives.map(drive => {
                  const driveLetterPath = `${drive.letter}:\\`;
                  const isSelected = explorerPath === driveLetterPath;
                  return (
                    <button
                      key={drive.letter}
                      onClick={() => handleExplorerClick(driveLetterPath)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-[12px] font-bold transition-all ${
                        isSelected 
                          ? 'bg-black/5 dark:bg-white/5' 
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      style={isSelected ? { color: accentColor } : {}}
                    >
                      <span className="material-symbols-outlined text-[15px] text-zinc-500">hard_drive</span>
                      <span className="truncate">{drive.label || `Disk (${drive.letter}:)`}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category: Folders Browser */}
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[9px] font-bold tracking-wider text-on-surface-variant/40 dark:text-zinc-500 uppercase">
                    Folders
                  </span>
                  {explorerPath && (
                    <button 
                      onClick={handleExplorerGoUp}
                      className="w-4.5 h-4.5 rounded hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                      title="Parent folder"
                    >
                      <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 max-h-[170px] overflow-y-auto pr-0.5">
                  {explorerLoading ? (
                    <div className="py-5 flex flex-col items-center justify-center gap-1 text-on-surface-variant/45">
                      <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" style={{ borderTopColor: accentColor }}></div>
                      <span className="text-[9.5px]">Loading...</span>
                    </div>
                  ) : explorerItems.length === 0 ? (
                    <div className="py-2 text-center text-[10px] text-on-surface-variant/40 dark:text-zinc-500 font-medium">
                      No subfolders
                    </div>
                  ) : (
                    explorerItems.map(folder => {
                      const isFolderSelected = explorerPath === folder.path;
                      return (
                        <button
                          key={folder.path}
                          onClick={() => handleExplorerClick(folder.path)}
                          onDoubleClick={() => {
                            handleExplorerClick(folder.path);
                            setTargetPath(folder.path);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded-[6px] text-left text-[11.5px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all text-on-surface/90 dark:text-zinc-300 group ${
                            isFolderSelected ? 'bg-black/5 dark:bg-white/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {renderMacFolderIcon(isFolderSelected)}
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <span className="material-symbols-outlined text-[12px] text-on-surface-variant/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            chevron_right
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Confirm target selection */}
                {explorerPath && (
                  <div className="mt-auto pt-3 border-t border-black/[0.04] dark:border-white/5">
                    <button
                      onClick={handleConfirmExplorerPath}
                      disabled={explorerPath === targetPath}
                      className="w-full h-9 rounded-[6px] text-[11px] font-bold text-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                      style={{ backgroundColor: accentColor }}
                    >
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Select Folder
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* -------------------------------------------- */}
          {/* Right Column: Main Detail Staged Content     */}
          {/* -------------------------------------------- */}
          <div className="flex-1 flex flex-col p-5 overflow-y-auto min-w-0 bg-black/[0.01] dark:bg-white/[0.005]">
            
            {isUploading ? (
              /* ======================================================== */
              /* iOS Springboard Progress Loading Screen Grid             */
              /* ======================================================== */
              <div className="flex-1 flex flex-col items-center justify-center py-2">
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-8 gap-y-6 justify-items-center w-full max-h-[260px] overflow-y-auto hide-scrollbar px-2">
                  {stagedFiles.map((file, index) => {
                    const progress = getFileProgress(index);
                    const fileType = getFileType({ name: file.name, isDirectory: false });
                    
                    let statusText = 'Waiting...';
                    if (progress > 0 && progress < 80) statusText = 'Uploading...';
                    else if (progress >= 80 && progress < 100) statusText = 'Processing...';
                    else if (progress === 100) statusText = 'Completed';

                    return (
                      <div key={index} className="flex flex-col items-center gap-1.5 group animate-menu-in">
                        
                        {/* Squircle App Loader container */}
                        <div className="relative w-15 h-15 rounded-[22%] bg-black/5 dark:bg-white/5 flex items-center justify-center shadow-lg overflow-hidden border border-black/5 dark:border-white/10 transition-transform duration-200 group-hover:scale-105">
                          
                          {/* File Icon display */}
                          <div className="flex flex-col items-center justify-center shrink-0 pointer-events-none">
                            <span 
                              className="material-symbols-outlined text-[28px] filled"
                              style={{ color: fileType.color }}
                            >
                              {fileType.icon}
                            </span>
                          </div>

                          {/* Conic clock wipe mask overlay */}
                          {progress < 100 && (
                            <div 
                              className="absolute inset-0 transition-all duration-300 pointer-events-none"
                              style={{
                                background: `conic-gradient(transparent ${progress}%, rgba(0, 0, 0, 0.58) ${progress}%)`,
                              }}
                            />
                          )}

                          {/* Outer Dial loader and percentage counter */}
                          {progress < 100 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg className="w-9 h-9 rotate-[-90deg]">
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r="14" 
                                  className="stroke-white/25" 
                                  strokeWidth="2.5" 
                                  fill="transparent" 
                                />
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r="14" 
                                  className="stroke-white transition-all duration-300" 
                                  strokeWidth="2.5" 
                                  fill="transparent" 
                                  strokeDasharray={2 * Math.PI * 14}
                                  strokeDashoffset={2 * Math.PI * 14 * (1 - progress / 100)}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute text-[8px] font-extrabold text-white tracking-tighter">
                                {progress}%
                              </span>
                            </div>
                          )}
                          
                          {/* Success completion checkmark (grey, theme-aware, simple) */}
                          {progress === 100 && (
                            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center animate-fade-in">
                              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 flex items-center justify-center shadow-sm border border-black/10 dark:border-white/10">
                                <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title and state labeling */}
                        <div className="flex flex-col items-center max-w-[80px] text-center">
                          <span className="text-[10px] font-semibold truncate w-full text-on-surface dark:text-zinc-200" title={file.relativePath || file.name}>
                            {file.name}
                          </span>
                          <span className="text-[8px] font-bold text-on-surface-variant/45 dark:text-zinc-500 tracking-wide uppercase">
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall master stats */}
                <div className="mt-5 flex flex-col items-center w-full max-w-sm gap-2">
                  <div className="flex justify-between w-full text-[12px] font-bold text-on-surface-variant dark:text-zinc-400">
                    <span>Uploading...</span>
                    <span style={{ color: accentColor }}>{uploadTotalProgress}% Total</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${uploadTotalProgress}%`, 
                        backgroundColor: accentColor, 
                        boxShadow: `0 0 10px ${accentColor}80`
                      }}
                    />
                  </div>
                  <span className="text-[9.5px] text-on-surface-variant/45 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                    Placing files at: {targetPath}
                  </span>
                </div>

              </div>
            ) : (
              /* ======================================================== */
              /* Standard Drag & Drop Selection View Layout              */
              /* ======================================================== */
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* Drag zone card (macOS style: rounded-[10px]) */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative border border-dashed rounded-[10px] p-5 flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[110px]
                    ${isDragOver 
                      ? 'scale-[0.99] border-solid bg-black/[0.03] dark:bg-white/[0.03]' 
                      : 'border-black/[0.07] dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]'
                    }
                  `}
                  style={{ 
                    borderColor: isDragOver ? accentColor : undefined, 
                    backgroundColor: isDragOver ? `${accentColor}05` : undefined 
                  }}
                >
                  {/* File Upload Selector */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* HTML5 Webkit Directory Upload Selector */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    className="hidden"
                  />

                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1c1c21] shadow flex items-center justify-center border border-black/5 dark:border-white/5 mb-2">
                    <span 
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: accentColor }}
                    >
                      cloud_upload
                    </span>
                  </div>
                  
                  <p className="text-[12px] font-bold text-on-surface/90 dark:text-zinc-350">
                    Drag and drop files & folders here, or browse
                  </p>
                  
                  {/* Dual Action Browse Selection Buttons */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-[6px] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white/40 dark:bg-white/5 text-[11px] font-bold transition-all hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      Browse Files
                    </button>
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="h-8 px-3 rounded-[6px] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white/40 dark:bg-white/5 text-[11px] font-bold transition-all hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      Browse Folder
                    </button>
                  </div>
                </div>

                {/* Staged files list display */}
                {stagedFiles.length > 0 ? (
                  <div className="mt-4 flex flex-col min-h-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <span className="text-[8.5px] font-bold tracking-wider text-on-surface-variant/40 dark:text-zinc-500 uppercase px-1">
                        Staged Items ({stagedFiles.length})
                      </span>
                    </div>

                    {/* Staged file rows list (macOS style corners: rounded-[10px]) */}
                    <div className="flex-1 overflow-y-auto rounded-[10px] border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-1.5 flex flex-col gap-1 shadow-inner">
                      {stagedFiles.map((file, idx) => {
                        const fileType = getFileType({ name: file.name, isDirectory: false });
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-2 rounded-[8px] bg-white/40 dark:bg-[#16161a]/20 border border-black/[0.03] dark:border-white/[0.03] hover:border-black/5 dark:hover:border-white/5 shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {renderMacFileIcon(file.name, fileType.color)}
                              
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11.5px] font-bold truncate text-on-surface dark:text-zinc-200" title={file.relativePath || file.name}>
                                  {file.relativePath || file.name}
                                </span>
                                <span className="text-[8.5px] text-on-surface-variant/50 dark:text-zinc-500 font-extrabold uppercase">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); removeStagedFile(idx); }}
                              className="w-6 h-6 rounded-[6px] bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                              title="Remove item"
                            >
                              <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-on-surface-variant/40 dark:text-zinc-500 py-5">
                    <span className="material-symbols-outlined text-[32px] opacity-20">description</span>
                    <span className="text-[11px] font-bold">No files or folders staged for upload</span>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ============================================== */}
        {/* Modal Window Footer Actions (Sleek macOS spacing) */}
        {/* ============================================== */}
        {!isUploading && (
          <div className="h-16 shrink-0 border-t border-black/[0.04] dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.008] flex items-center justify-end gap-3 px-6">
            <button
              onClick={hideModal}
              className="h-9 px-5 rounded-[8px] text-[11.5px] font-bold text-on-surface-variant/75 hover:text-on-surface dark:text-zinc-400 dark:hover:text-zinc-250 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStartUpload}
              disabled={stagedFiles.length === 0}
              className="h-9 px-6 rounded-[8px] text-white text-[12px] font-bold shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:grayscale disabled:pointer-events-none ios-gradient flex items-center gap-1.5"
              style={{ backgroundColor: accentColor, boxShadow: stagedFiles.length > 0 ? `0 6px 15px -3px ${accentColor}60` : undefined }}
            >
              <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
              Upload {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
