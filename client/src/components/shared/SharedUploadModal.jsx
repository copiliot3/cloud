import { useState, useEffect, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';
import { shareApi } from '../../api/shareApi';
import { formatBytes } from '../../utils/formatBytes';

export default function SharedUploadModal({ shareId, canWrite }) {
  const { modal, hideModal, addToast, accentColor, darkMode } = useUIStore();
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const isOpen = modal.visible && modal.type === 'upload' && shareId && canWrite;

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    setFiles(droppedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      addToast('Please select files to upload', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await shareApi.upload(
        shareId,
        '',
        files,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      addToast(
        `${files.length} file(s) uploaded successfully`,
        'success'
      );
      setFiles([]);
      setUploadProgress(0);
      hideModal();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) {
      addToast('Upload in progress', 'warning');
      return;
    }
    setFiles([]);
    setUploadProgress(0);
    hideModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#161618] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-blue-600">
              upload
            </span>
            <div>
              <h2 className="font-bold text-lg">Upload Files</h2>
              <p className="text-sm text-black/60 dark:text-white/60">
                Add files to the shared folder
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[48px] text-blue-600 mx-auto block mb-2">
              cloud_upload
            </span>
            <p className="font-semibold">Drag files here</p>
            <p className="text-sm text-black/60 dark:text-white/60 mt-1">
              or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Browse Files
            </button>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-black/60 dark:text-white/60">
                {files.length} file(s) selected
              </p>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                        description
                      </span>
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <span className="text-xs text-black/60 dark:text-white/60 flex-shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Uploading...</p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {uploadProgress}%
                </p>
              </div>
              <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{ backgroundColor: isUploading ? '#999' : '#013399' }}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
