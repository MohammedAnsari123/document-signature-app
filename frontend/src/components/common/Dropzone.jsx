import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, X, Loader2 } from 'lucide-react';

const Dropzone = ({ onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const token = localStorage.getItem('token');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = async (files) => {
        const file = files[0];
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are allowed.');
            return;
        }
        setError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/docs/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            onUpload(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleChange}
                />

                {uploading ? (
                    <div className="flex flex-col items-center text-blue-600">
                        <Loader2 className="animate-spin h-10 w-10 mb-2" />
                        <p>Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-500">
                        <Upload className="h-10 w-10 mb-2" />
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm">SVG, PNG, JPG or PDF (max. 10MB)</p>
                    </div>
                )}
            </div>
            {error && (
                <div className="mt-2 text-red-500 text-sm flex items-center">
                    <X className="h-4 w-4 mr-1" /> {error}
                </div>
            )}
        </div>
    );
};

export default Dropzone;
