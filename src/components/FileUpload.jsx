import { useRef, useState } from 'preact/hooks';
import { uploadImage } from '../lib/api.js';

/**
 * File upload component for sending images to Claude's vision API.
 *
 * When the user selects an image, it's uploaded to the backend which
 * converts it to base64 and returns it. The base64 data is then
 * passed up to ChatView via onImageReady, where it's included in
 * the next chat message.
 *
 * Props:
 *   onImageReady({ base64, mediaType }) - Called when image is ready
 *   disabled - Whether upload should be disabled
 *   hasPending - Whether there's already a pending image
 */
export function FileUpload({ onImageReady, disabled, hasPending }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const result = await uploadImage(file);
      onImageReady({ base64: result.base64, mediaType: result.mediaType });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div class="file-upload">
      <label class="file-upload-label">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          class="file-upload-input"
        />
        <span class="file-upload-button">
          {uploading ? 'Uploading...' : 'Attach Image'}
        </span>
      </label>

      {hasPending && (
        <span class="file-upload-pending">Image attached - will be sent with next message</span>
      )}

      {error && <span class="file-upload-error">{error}</span>}
    </div>
  );
}
