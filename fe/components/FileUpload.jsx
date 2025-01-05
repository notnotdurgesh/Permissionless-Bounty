import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';


const FileUpload = ({ 
  onFileUpload, 
  accept = "*", 
  multiple = false,
  label = "Upload Files",
  hint = "Drag and drop files here, or click to select"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const processPDF = async (file) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        const pageText = text.items.map((item) => item.str).join(' ');
        textContent += `${pageText}\n`;
    }
    return textContent;
};

  const processDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const processTxt = async (file) => {
    return await file.text();
  };

  const processPptx = async (file) => {
    const zip = await JSZip.loadAsync(file);
    let textContent = '';
    for (const filename in zip.files) {
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        const content = await zip.files[filename].async('text');
        const text = content.match(/<a:t>(.*?)<\/a:t>/g)?.map(match => match.replace(/<\/?a:t>/g, '')).join(' ');
        textContent += `${text}\n`;
      }
    }
    return textContent;
  };

  const processFile = async (file) => {
    try {
      let textContent = '';
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        textContent = await processTxt(file);
      } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        textContent = await processPDF(file);
      } else if (file.type.includes('document') || file.name.endsWith('.docx')) {
        textContent = await processDocx(file);
      } else if (file.name.endsWith('.pptx')) {
        textContent = await processPptx(file);
      } else {
        setError(`Unsupported file type: ${file.type}`);
        return;
      }

      const fileData = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        content: textContent,
        preview: URL.createObjectURL(file),
      };

      setUploadedFiles((prev) => [...prev, fileData]);
      onFileUpload(fileData);
    } catch (err) {
      setError(`Error processing file ${file.name}: ${err.message}`);
    }
  };

  const handleFiles = useCallback((files) => {
    setError("");
    Array.from(files).forEach(processFile);
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const { files } = e.dataTransfer;
    handleFiles(files);
  }, [handleFiles]);

  const removeFile = useCallback((fileToRemove) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
  }, []);

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6
          flex flex-col items-center justify-center gap-4
          transition-all duration-200 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-100'
          }
        `}
      >
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-sm font-medium text-slate-700">{hint}</p>
          <p className="text-xs text-slate-500">
            {accept.split(',').join(', ')} files supported
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div 
              key={file.name}
              className="flex items-center justify-between p-3 bg-white rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(file)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;