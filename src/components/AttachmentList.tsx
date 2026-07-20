import React, { useState } from 'react';
import { attachmentApi, Attachment } from '../services/api';
import toast from 'react-hot-toast';
import { 
  FileImage, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  Download, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { formatRelativeTime } from './NotificationPanel';

interface AttachmentListProps {
  attachments: Attachment[];
  userRole: string;
  currentUserId: string;
  onDeleteSuccess: (attachmentId: string) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-4 w-4 text-emerald-600" />;
  }
  if (ext === 'pdf') {
    return <FileText className="h-4 w-4 text-rose-600" />;
  }
  if (['docx', 'doc', 'txt'].includes(ext || '')) {
    return <FileCode className="h-4 w-4 text-blue-600" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className="h-4 w-4 text-amber-600" />;
  }
  return <File className="h-4 w-4 text-neutral-600" />;
};

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  userRole,
  currentUserId,
  onDeleteSuccess,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    try {
      const blob = await attachmentApi.download(attachment.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: attachment.mime_type }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Are you sure you want to remove '${attachment.file_name}'?`)) return;

    setDeletingId(attachment.id);
    try {
      await attachmentApi.delete(attachment.id);
      onDeleteSuccess(attachment.id);
      toast.success(`Removed '${attachment.file_name}'`);
    } catch (err) {
      console.error('Delete attachment failed:', err);
      toast.error('Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2 select-none">
      <h6 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">attachments</h6>
      <div className="border border-neutral-100 rounded-xl divide-y divide-neutral-50 overflow-hidden bg-neutral-50/20">
        {attachments.map((attachment) => {
          const isOwnerOrAdmin = 
            attachment.uploaded_by === currentUserId || 
            ['OWNER', 'ADMIN'].includes(userRole);

          const isDownloading = downloadingId === attachment.id;
          const isDeleting = deletingId === attachment.id;

          return (
            <div key={attachment.id} className="flex items-center justify-between p-3 gap-3 hover:bg-neutral-50/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-white border border-neutral-100 rounded-lg shrink-0">
                  {getFileIcon(attachment.mime_type, attachment.file_name)}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-neutral-800 truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    {formatSize(attachment.file_size)} · {attachment.uploader?.name || 'unknown'} · {formatRelativeTime(attachment.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  disabled={isDownloading || isDeleting}
                  title="Download file"
                  className="text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 p-1.5 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Delete Button */}
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment)}
                    disabled={isDownloading || isDeleting}
                    title="Delete attachment"
                    className="text-neutral-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
