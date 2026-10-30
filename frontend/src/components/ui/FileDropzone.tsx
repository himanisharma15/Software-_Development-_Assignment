import { useRef, useState } from 'react';
import Button from './Button';

type FileDropzoneProps = {
  file: File | null;
  onSelect: (file: File | null) => void;
};

export default function FileDropzone({ file, onSelect }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (!/\.(csv|txt)$/i.test(candidate.name)) return;
    onSelect(candidate);
  };

  return (
    <div
      className={`rounded-control border border-dashed p-5 text-center transition ${dragging ? 'border-primary bg-primary-tint' : 'border-border bg-surface'}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" aria-label="Upload CSV or text file" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-control bg-primary-tint text-primary">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <p className="text-sm font-medium text-text">{file?.name ?? 'Drop a CSV or TXT file here'}</p>
      <p className="mt-1 text-xs text-muted">Email addresses will be detected automatically</p>
      <Button className="mt-3" onClick={() => inputRef.current?.click()}>{file ? 'Choose another file' : 'Browse files'}</Button>
    </div>
  );
}