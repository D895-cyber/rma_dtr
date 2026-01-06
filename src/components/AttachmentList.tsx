import React, { useState, useEffect } from 'react';
import { Download, Trash2, File, Image, FileText, FileArchive, Loader2, X, Maximize2 } from 'lucide-react';
import { attachmentService, CaseAttachment } from '../services/attachment.service';
import { useAuth } from '../contexts/AuthContext';

interface AttachmentListProps {
  caseId: string;
  caseType: 'DTR' | 'RMA';
}

export function AttachmentList({ caseId, caseType }: AttachmentListProps) {
  const { currentUser } = useAuth();
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [caseId, caseType]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await attachmentService.getAttachments(caseId, caseType);
      if (response.success) {
        setAttachments(response.data.attachments);
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: CaseAttachment) => {
    try {
      // If Cloudinary URL exists, open it directly
      if (attachment.cloudinaryUrl) {
        window.open(attachment.cloudinaryUrl, '_blank');
        return;
      }

      // Fallback to download endpoint
      const blob = await attachmentService.downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (attachment: CaseAttachment) => {
    if (!confirm(`Are you sure you want to delete "${attachment.fileName}"?`)) {
      return;
    }

    try {
      setDeleting(attachment.id);
      await attachmentService.deleteAttachment(attachment.id);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment');
    } finally {
      setDeleting(null);
    }
  };

  const getImageUrl = (attachment: CaseAttachment): string => {
    // Use Cloudinary URL if available, otherwise use download endpoint
    if (attachment.cloudinaryUrl) {
      return attachment.cloudinaryUrl;
    }
    // For local files, we'd need to serve them, but for now return empty
    return '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Separate attachments by type
  const imageAttachments = attachments.filter(a => 
    a.fileType === 'image' || a.mimeType?.startsWith('image/')
  );
  const logAttachments = attachments.filter(a => 
    a.fileType === 'log' || a.fileName?.toLowerCase().endsWith('.zip') || a.fileName?.toLowerCase().endsWith('.log')
  );
  const otherAttachments = attachments.filter(a => 
    !imageAttachments.includes(a) && !logAttachments.includes(a)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      {imageAttachments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Part Images ({imageAttachments.length})</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imageAttachments.map((attachment) => {
              const imageUrl = getImageUrl(attachment);
              // Check delete permission - allow if user uploaded it, or is admin/manager
              const isUploader = currentUser && String(currentUser.id) === String(attachment.uploadedBy);
              const isAdminOrManager = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
              const canDelete = isUploader || isAdminOrManager;
              

              return (
                <div
                  key={attachment.id}
                  className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={attachment.fileName}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {/* Action buttons - always visible for better UX */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <button
                      onClick={() => setSelectedImage(imageUrl)}
                      className="p-2 bg-blue-600 bg-opacity-90 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
                      title="View Full Size"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(attachment)}
                        disabled={deleting === attachment.id}
                        className="p-2 bg-red-600 bg-opacity-90 text-white rounded-full hover:bg-red-700 transition-all shadow-lg disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {/* Hover overlay for full-size view */}
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity cursor-pointer"
                    onClick={() => setSelectedImage(imageUrl)}
                  />
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-600 truncate" title={attachment.fileName}>
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-gray-400">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs Section */}
      {logAttachments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileArchive className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900">Logs / ZIP Files ({logAttachments.length})</h4>
          </div>
          <div className="space-y-2">
            {logAttachments.map((attachment) => {
              const canDelete = currentUser && (
                String(currentUser.id) === String(attachment.uploadedBy) ||
                currentUser.role === 'admin' ||
                currentUser.role === 'manager'
              );

              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileArchive className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        {attachment.uploader && (
                          <>
                            <span>•</span>
                            <span>Uploaded by {attachment.uploader.name}</span>
                          </>
                        )}
                        {attachment.createdAt && (
                          <>
                            <span>•</span>
                            <span>{new Date(attachment.createdAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 hover:bg-orange-100 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-orange-600" />
                    </button>
                    {canDelete ? (
                      <button
                        onClick={() => handleDelete(attachment)}
                        disabled={deleting === attachment.id}
                        className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 px-2" title="Only uploader, admin, or manager can delete">
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Documents */}
      {otherAttachments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <File className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Documents ({otherAttachments.length})</h4>
          </div>
          <div className="space-y-2">
            {otherAttachments.map((attachment) => {
              // Always allow admin/manager to delete, or if user uploaded it
              const isAdmin = currentUser?.role === 'admin';
              const isManager = currentUser?.role === 'manager';
              const isUploader = currentUser && String(currentUser.id) === String(attachment.uploadedBy);
              const canDelete = isAdmin || isManager || isUploader;
              

              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {attachment.mimeType === 'application/pdf' ? (
                      <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        {attachment.uploader && (
                          <>
                            <span>•</span>
                            <span>Uploaded by {attachment.uploader.name}</span>
                          </>
                        )}
                        {attachment.createdAt && (
                          <>
                            <span>•</span>
                            <span>{new Date(attachment.createdAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 hover:bg-blue-50 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </button>
                    {canDelete ? (
                      <button
                        onClick={() => handleDelete(attachment)}
                        disabled={deleting === attachment.id}
                        className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 px-2" title="Only uploader, admin, or manager can delete">
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
