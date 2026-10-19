// UploadZone.tsx – reusable file upload component
// Usage: <UploadZone onFilesSelected={handleFiles} accept="image/*" multiple label="Choose Files" />
import React from "react";

type UploadZoneProps = {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
};

export default function UploadZone({ onFilesSelected, accept = "image/*", multiple = false, label = "Choose files" }: UploadZoneProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
    }
    e.target.value = ""; // reset
  };

  return (
    <label className="upload-dropzone">
      <input type="file" accept={accept} multiple={multiple} onChange={handleChange} />
      <div className="dropzone-content">
        <span className="dropzone-icon">📁</span>
        <div>
          <strong>{label}</strong>
          <p>Drag &amp; drop or click to browse.</p>
        </div>
        <span className="btn-browse">Browse Files</span>
      </div>
    </label>
  );
}
