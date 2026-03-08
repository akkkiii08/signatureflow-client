import { useState, useRef } from 'react';
import { documentService } from '../../services/documentService';
import toast from 'react-hot-toast';
import { X, Upload, FileText, Send } from 'lucide-react';

interface Props { onClose: () => void; onSuccess: () => void; }

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', signerEmail: '', signerName: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') { setFile(f); setForm(prev => ({ ...prev, title: f.name.replace('.pdf', '') })); }
    else toast.error('Please upload a PDF file');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setForm(prev => ({ ...prev, title: f.name.replace('.pdf', '') })); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await documentService.upload(fd);
      toast.success('Document uploaded successfully!');
      onSuccess();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-light rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Upload Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver ? 'border-amber-400 bg-amber-400/5' : file ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-white/10 hover:border-white/25'
            }`}
          >
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-emerald-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">Drop PDF here or click to browse</p>
                <p className="text-slate-500 text-sm mt-1">Maximum 20MB</p>
              </>
            )}
          </div>

          {/* Form fields */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Document Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="Contract Agreement" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Signer Name</label>
              <input value={form.signerName} onChange={e => setForm({...form, signerName: e.target.value})} className="input-field" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Signer Email</label>
              <input type="email" value={form.signerEmail} onChange={e => setForm({...form, signerEmail: e.target.value})} className="input-field" placeholder="jane@company.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Message (optional)</label>
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="input-field resize-none" rows={2} placeholder="Please review and sign this document..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={!file || loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? 'Uploading...' : (<><Send className="w-4 h-4" /> Upload Document</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
