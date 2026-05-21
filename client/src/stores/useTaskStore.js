import { create } from 'zustand';

/**
 * Task Object Structure:
 * {
 *   id: string,
 *   type: 'upload' | 'download' | 'copy' | 'move',
 *   title: string,
 *   status: 'pending' | 'active' | 'completed' | 'error',
 *   progress: number, // 0-100
 *   error: string | null
 * }
 */

const useTaskStore = create((set, get) => ({
  tasks: [],
  isMinimized: true,

  toggleMinimized: () => set(state => ({ isMinimized: !state.isMinimized })),
  
  addTask: (task) => set(state => ({ 
    tasks: [{ ...task, status: 'pending', progress: 0 }, ...state.tasks],
    isMinimized: false // Auto-expand when new task arrives
  })),

  updateTask: (id, updates) => set(state => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  completeTask: (id) => set(state => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status: 'completed', progress: 100 } : t)
  })),

  failTask: (id, error) => set(state => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status: 'error', error } : t)
  })),

  removeTask: (id) => set(state => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),

  clearCompleted: () => set(state => ({
    tasks: state.tasks.filter(t => t.status !== 'completed' && t.status !== 'error')
  }))
}));

export default useTaskStore;
