import { useId, useRef, useState, type DragEvent } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Button } from './primitives';

export function FileUpload({
  onFilesSelected,
  accept,
  multiple = false,
  disabled = false,
  label = 'Choose a file',
  helperText = 'or drag and drop it here',
  onError,
}: {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  onError?: (message: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function dispatch(files: FileList | null) {
    if (!files?.length) return;
    if (!multiple && files.length > 1) {
      onError?.('Select one file at a time.');
      return;
    }
    onFilesSelected(Array.from(files));
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) dispatch(event.dataTransfer.files);
  }
  return (
    <div
      className={['us-file-upload', dragging && 'is-dragging', disabled && 'is-disabled']
        .filter(Boolean)
        .join(' ')}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        id={id}
        className="us-sr-only"
        type="file"
        aria-label={label}
        aria-describedby={`${id}-help`}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          dispatch(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
      <span className="us-upload-icon">
        <FileUp size={22} />
      </span>
      <span className="us-upload-copy">
        <strong>{label}</strong>
        <span id={`${id}-help`}>{helperText}</span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leadingIcon={<Upload size={15} />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Browse
      </Button>
    </div>
  );
}
