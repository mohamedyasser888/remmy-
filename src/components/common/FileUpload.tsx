/**
 * File Upload Component
 * Image upload with drag & drop and preview
 */

import { ImageEmojiEditor } from './ImageEmojiEditor';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  preview?: string | null;
  error?: string;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, preview, error, disabled }: FileUploadProps) {
  return <ImageEmojiEditor onFileSelect={onFileSelect} preview={preview} error={error} disabled={disabled} />;
}
