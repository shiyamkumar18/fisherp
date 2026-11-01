import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, X, RotateCw, AlertTriangle, ShieldCheck, Film, Music } from 'lucide-react';
import clsx from 'clsx';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SUPPORTED_TYPES = [
  'image/png', 'image/jpeg', 'application/pdf', 'text/csv', 
  'application/zip', 'application/json', 'text/plain', 
  'video/mp4', 'audio/mpeg', 'audio/mp3'
];

export function AttachmentUploader({ files, setFiles }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFile = (file) => {
    if (!SUPPORTED_TYPES.includes(file.type) && !file.name.endsWith('.log')) {
      alert(`Unsupported file type: ${file.name}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`File size exceeds 25MB limit: ${file.name}`);
      return;
    }

    const fileId = Math.random().toString(36).substring(2, 9);
    const newFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading', // uploading, scanning, completed, failed
      virusScan: 'pending', // pending, scanning, secure, failed
      nativeFile: file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    };

    setFiles(prev => [...prev, newFile]);
    simulateUpload(fileId);
  };

  const simulateUpload = (id) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => {
          if (f.id === id) {
            simulateVirusScan(id);
            return { ...f, progress: 100, status: 'scanning' };
          }
          return f;
        }));
      } else {
        setFiles(prev => prev.map(f => {
          if (f.id === id) {
            return { ...f, progress };
          }
          return f;
        }));
      }
    }, 300);
  };

  const simulateVirusScan = (id) => {
    setTimeout(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === id) {
          return { ...f, status: 'completed', virusScan: 'secure' };
        }
        return f;
      }));
    }, 1000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach(validateAndAddFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      Array.from(e.target.files).forEach(validateAndAddFile);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file && file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const retryUpload = (id) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, progress: 0, status: 'uploading', virusScan: 'pending' };
      }
      return f;
    }));
    simulateUpload(id);
  };

  const getFileIcon = (type, name) => {
    if (type.startsWith('image/')) return null;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-indigo-400" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-sky-400" />;
    if (name.endsWith('.log') || type === 'text/plain') return <FileText className="w-5 h-5 text-amber-400" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <UploadCloud size={14} /> Attachment Workspace
      </label>

      {/* Drag Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className={clsx(
          "w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white/[0.01]",
          dragActive 
            ? "border-indigo-500 bg-indigo-500/[0.03]" 
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg,.pdf,.csv,.zip,.json,.log,.mp4,.mp3"
        />
        <UploadCloud className="w-8 h-8 text-slate-500" />
        <div className="text-center">
          <p className="text-xs font-medium text-slate-300">
            Drag & drop files here, or <span className="text-indigo-400 hover:underline">browse</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            PNG, JPG, PDF, CSV, ZIP, JSON, LOG, MP4, MP3 (Max 25MB)
          </p>
        </div>
      </div>

      {/* Uploaded Files Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all group"
            >
              {/* Thumbnail / Icon */}
              <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {file.previewUrl ? (
                  <img src={file.previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(file.type, file.name)
                )}
              </div>

              {/* Progress and Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-300 truncate">{file.name}</p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-500 flex items-center gap-2">
                  <span>{formatSize(file.size)}</span>
                  {file.status === 'uploading' && <span className="text-indigo-400">Uploading {file.progress}%</span>}
                  {file.status === 'scanning' && <span className="text-amber-400 animate-pulse">Virus scanning...</span>}
                  {file.status === 'completed' && (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck size={10} /> Secure
                    </span>
                  )}
                </p>

                {/* Progress bar */}
                {file.status === 'uploading' && (
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
