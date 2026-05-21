import { create } from 'zustand';
import { VIEW_MODES } from '../utils/constants';

const useUIStore = create((set, get) => ({
  // View mode
  viewMode: localStorage.getItem('viewMode') || VIEW_MODES.LIST,
  setViewMode: (mode) => {
    localStorage.setItem('viewMode', mode);
    set({ viewMode: mode });
  },

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Active nav section
  activeNav: 'my-files',
  setActiveNav: (id) => set({ activeNav: id }),

  // Context menu
  contextMenu: { visible: false, x: 0, y: 0, item: null },
  showContextMenu: (x, y, item) => set({ contextMenu: { visible: true, x, y, item } }),
  hideContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, item: null } }),

  // Modal
  modal: { visible: false, type: null, data: null },
  showModal: (type, data) => set({ modal: { visible: true, type, data } }),
  hideModal: () => set({ modal: { visible: false, type: null, data: null } }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },

  // Upload state
  uploading: false,
  uploadProgress: [],
  setUploading: (v) => set({ uploading: v }),

  // Current view — 'drives' or 'files'
  currentView: 'drives',
  setCurrentView: (view) => set({ currentView: view }),

  // Theme & Customization
  accentColor: localStorage.getItem('accentColor') || '#013399',
  folderColor: localStorage.getItem('folderColor') || '#3fa0f6',
  enableAnimations: localStorage.getItem('enableAnimations') !== 'false',
  customFolderColors: JSON.parse(localStorage.getItem('customFolderColors') || '{}'),
  darkMode: localStorage.getItem('darkMode') || 'light',

  setAccentColor: (color) => {
    localStorage.setItem('accentColor', color);
    set({ accentColor: color });
    document.documentElement.style.setProperty('--primary', color);
  },
  setFolderColor: (color) => {
    localStorage.setItem('folderColor', color);
    set({ folderColor: color });
  },
  setEnableAnimations: (val) => {
    localStorage.setItem('enableAnimations', val);
    set({ enableAnimations: val });
  },
  setCustomFolderColor: (path, color) => {
    set((s) => {
      const newColors = { ...s.customFolderColors, [path]: color };
      localStorage.setItem('customFolderColors', JSON.stringify(newColors));
      return { customFolderColors: newColors };
    });
  },
  setDarkMode: (mode) => {
    localStorage.setItem('darkMode', mode);
    set({ darkMode: mode });
  },
  customAccentColors: JSON.parse(localStorage.getItem('customAccentColors') || '[]'),
  
  addCustomAccentColor: (color) => {
    set((state) => {
      if (state.customAccentColors.includes(color)) return state;
      const newColors = [color, ...state.customAccentColors].slice(0, 5); // Keep last 5
      localStorage.setItem('customAccentColors', JSON.stringify(newColors));
      return { customAccentColors: newColors };
    });
  },

  customColorModalVisible: false,
  toggleCustomColorModal: (visible) => set({ customColorModalVisible: visible }),
  
  resetAppearance: () => {
    localStorage.removeItem('accentColor');
    localStorage.removeItem('folderColor');
    localStorage.removeItem('enableAnimations');
    localStorage.removeItem('customFolderColors');
    localStorage.removeItem('darkMode');
    const defaultColor = '#013399';
    set({ 
      accentColor: defaultColor, 
      folderColor: '#3fa0f6', 
      enableAnimations: true,
      customFolderColors: {},
      darkMode: 'light'
    });
    document.documentElement.style.setProperty('--primary', defaultColor);
  },
}));

export default useUIStore;
