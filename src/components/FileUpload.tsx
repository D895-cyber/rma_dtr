import React, { useState } from 'react';
import { Upload, X, File, Loader2, Image, FileArchive } from 'lucide-react';
import { attachmentService } from '../services/attachment.service';

interface FileUploadProps {
  caseId: string;
  caseType: 'DTR' | 'RMA';
  onUploadComplete?: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function FileUpload({ caseId, caseType, onUploadComplete }: FileUploadProps) {
  const [images, setImages] = useState<FileWithPreview[]>([]);
  const [logs, setLogs] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const categorizeFile = (file: File): 'image' | 'log' | 'document' => {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (fileName.endsWith('.zip') || fileName.endsWith('.log') || mimeType.includes('zip')) {
      return 'log';
    } else {
      return 'document';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: FileWithPreview[] = [];

      selectedFiles.forEach(file => {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} exceeds 10MB limit`);
          return;
        }

        const category = categorizeFile(file);
        const fileWithPreview = file as FileWithPreview;

        // Create preview for images
        if (category === 'image') {
          fileWithPreview.preview = URL.createObjectURL(file);
        }

        validFiles.push(fileWithPreview);
      });

      // Categorize files
      validFiles.forEach(file => {
        const category = categorizeFile(file);
        if (category === 'image') {
          setImages(prev => [...prev, file]);
        } else if (category === 'log') {
          setLogs(prev => [...prev, file]);
        } else {
          setDocuments(prev => [...prev, file]);
        }
      });

      setError(null);
    }
  };

  const removeFile = (file: File, category: 'image' | 'log' | 'document') => {
    if (category === 'image') {
      const fileWithPreview = file as FileWithPreview;
      if (fileWithPreview.preview) {
        URL.revokeObjectURL(fileWithPreview.preview);
      }
      setImages(prev => prev.filter(f => f !== file));
    } else if (category === 'log') {
      setLogs(prev => prev.filter(f => f !== file));
    } else {
      setDocuments(prev => prev.filter(f => f !== file));
    }
  };

  const handleUpload = async () => {
    const allFiles = [...images, ...logs, ...documents];
    if (allFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress({});

    try {
      // Upload files one by one with progress tracking
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        try {
          await attachmentService.uploadAttachment(file, caseId, caseType);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          setError(`Failed to upload ${file.name}: ${err.message}`);
        }
      }

      // Clean up preview URLs
      images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });

      setImages([]);
      setLogs([]);
      setDocuments([]);
      setUploadProgress({});
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const totalFiles = images.length + logs.length + documents.length;

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <label
          htmlFor="file-upload"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Select Files</span>
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          accept="image/*,.zip,.log,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
        {totalFiles > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading {totalFiles} file{totalFiles > 1 ? 's' : ''}...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload {totalFiles} File{totalFiles > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Images Section */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-700">Part Images ({images.length})</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((file, index) => {
              const progress = uploadProgress[file.name] || 0;
              return (
                <div
                  key={index}
                  className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                >
                  {file.preview && (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeFile(file, 'image')}
                      disabled={uploading}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {uploading && progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs Section */}
      {logs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileArchive className="w-4 h-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-gray-700">Logs / ZIP Files ({logs.length})</h4>
          </div>
          <div className="space-y-2">
            {logs.map((file, index) => {
              const progress = uploadProgress[file.name] || 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileArchive className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    {uploading && progress < 100 && (
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file, 'log')}
                    disabled={uploading}
                    className="p-1 hover:bg-orange-100 rounded transition-colors ml-2"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <File className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-700">Documents ({documents.length})</h4>
          </div>
          <div className="space-y-2">
            {documents.map((file, index) => {
              const progress = uploadProgress[file.name] || 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    {uploading && progress < 100 && (
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file, 'document')}
                    disabled={uploading}
                    className="p-1 hover:bg-gray-200 rounded transition-colors ml-2"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
