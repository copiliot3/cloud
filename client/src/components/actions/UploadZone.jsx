import { useState, useCallback } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { fileApi } from '../../api/fileApi';

export default function UploadZone({ children }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { currentPath, refresh } = useFileStore();
  const { addToast, currentView } = useUIStore();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (currentView === 'files') {
      setIsDragOver(true);
    }
  }, [currentView]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    // Only hide if leaving the container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!currentPath || currentView !== 'files') return;

    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    const useTaskStoreModule = await import('../../stores/useTaskStore');
    const useTaskStore = useTaskStoreModule.default;
    const { addTask, updateTask, completeTask, failTask } = useTaskStore.getState();

    const taskId = `upload-${Date.now()}`;
    addTask({
      id: taskId,
      type: 'upload',
      title: `Uploading ${files.length} file(s)`
    });

    try {
      await fileApi.upload(currentPath, files, (progress) => {
        updateTask(taskId, { status: 'active', progress });
      });
      completeTask(taskId);
      refresh();
    } catch (err) {
      failTask(taskId, err.message);
      addToast(err.message, 'error');
    }
  }, [currentPath, currentView, addToast, refresh]);

  return (
    <div
      className="flex-1 flex flex-col relative min-h-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm rounded-xl m-2">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary/40 upload-zone-active">
            <span className="material-symbols-outlined text-[48px] text-primary/60">cloud_upload</span>
            <p className="text-lg font-semibold text-primary/80">Drop files to upload</p>
            <p className="text-sm text-on-surface-variant">Files will be uploaded to the current folder</p>
          </div>
        </div>
      )}
    </div>
  );
}
