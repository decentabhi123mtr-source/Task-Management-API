import React, { useRef, useState } from 'react';
import { attachmentApi, Attachment } from '../services/api';
import toast from 'react-hot-toast';
import { Paperclip, Loader2, AlertCircle } from 'lucide-react';

interface AttachmentUploaderProps {
  taskId: string;
  onUploadSuccess: (newAttachment: Attachment) => void;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  taskId,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setError(null);

    try {
      const newAttachment = await attachmentApi.upload(taskId, file);
      onUploadSuccess(newAttachment);
      toast.success(`Attached '${file.name}'`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      const serverMessage = err.response?.data?.message || 'failed to upload file. Please try again.';
      setError(serverMessage.toLowerCase());
      toast.error(serverMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all bg-white disabled:bg-neutral-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          <span>{isUploading ? 'attaching...' : 'attach file'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
