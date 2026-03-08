import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Document } from '../types';
import SignatureModal from '../components/signature/SignatureModal';
import toast from 'react-hot-toast';
import { Pen, CheckCircle, XCircle, Clock, Shield, Globe } from 'lucide-react';

declare global { interface Window { pdfjsLib: any; } }

type PageState = 'loading' | 'form' | 'signing' | 'signed' | 'rejected' | 'expired' | 'error';

export default function PublicSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [document, setDocument] = useState<Document | null>(null);
  const [signerInfo, setSignerInfo] = useState({ name: '', email: '' });
  const [signatures, setSignatures] = useState<any[]>([]);
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigCategory, setSigCategory] = useState<'signature' | 'initials' | 'stamp'>('signature');
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadPdfLib = async () => {
      if (!window.pdfjsLib) {
        const script = window.document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        await new Promise(res => { script.onload = res; window.document.head.appendChild(script); });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    };
    const loadDoc = async () => {
      try {
        await loadPdfLib();
        const { data } = await api.get(`/public/sign/${token}`);
        setDocument(data.document);
        setSignerInfo({ name: data.document.signerName || '', email: data.document.signerEmail || '' });
        setState('form');
      } catch (err: any) {
        const status = err.response?.data?.status;
        if (status === 'signed') setState('signed');
        else if (status === 'rejected') setState('rejected');
        else if (status === 'expired') setState('expired');
        else setState('error');
      }
    };
    loadDoc();
  }, [token]);

  const renderPDF = useCallback(async (doc: Document) => {
    if (!window.pdfjsLib || !canvasRef.current) return;
    try {
      const url = `/uploads/${doc.filePath.split('/uploads/')[1]}`;
      pdfDocRef.current = await window.pdfjsLib.getDocument(url).promise;
      const page = await pdfDocRef.current.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPdfLoaded(true);
    } catch (e) { console.error('PDF render error:', e); }
  }, [currentPage]);

  useEffect(() => {
    if (document && state === 'signing') {
      setTimeout(() => renderPDF(document), 300);
    }
  }, [document, state, currentPage, renderPDF]);

  const startSigning = () => {
    if (!signerInfo.name.trim()) { toast.error('Please enter your name'); return; }
    setState('signing');
  };

  const handleApplySig = (sig: any) => {
    setSignatures(prev => {
      const existing = prev.findIndex(s => s.category === sig.category);
      const updated = [...prev];
      const fieldsForCategory = document?.signatureFields.filter(f => f.type === sig.category || (sig.category === 'signature' && f.type === 'signature')) || [];
      const sigWithFields = { ...sig, fields: fieldsForCategory.map(f => ({ fieldId: f.id, x: f.x, y: f.y, page: f.page, width: f.width, height: f.height })) };
      if (existing >= 0) updated[existing] = sigWithFields;
      else updated.push(sigWithFields);
      return updated;
    });
    toast.success(`${sig.category} applied!`);
  };

  const submit = async () => {
    if (signatures.length === 0) { toast.error('Please add at least one signature'); return; }
    setSubmitting(true);
    try {
      await api.post(`/public/sign/${token}`, { signerName: signerInfo.name, signerEmail: signerInfo.email, signatures, action: 'sign' });
      setState('signed');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    if (!rejectionReason.trim()) { toast.error('Please provide a reason'); return; }
    setSubmitting(true);
    try {
      await api.post(`/public/sign/${token}`, { signerName: signerInfo.name, signerEmail: signerInfo.email, signatures: [], action: 'reject', rejectionReason });
      setState('rejected');
    } catch { toast.error('Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const StatusPage = ({ icon: Icon, color, title, message }: { icon: any; color: string; title: string; message: string }) => (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #0f0f17 0%, #1a1a2e 100%)' }}>
      <div className="text-center max-w-md">
        <div className={`w-24 h-24 rounded-full ${color} flex items-center justify-center mx-auto mb-6`}>
          <Icon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
        <p className="text-slate-400 text-lg">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Shield className="w-4 h-4" />
          <span>Secured by SignatureFlow</span>
        </div>
      </div>
    </div>
  );

  if (state === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f17' }}>
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading document...</p>
      </div>
    </div>
  );

  if (state === 'signed') return <StatusPage icon={CheckCircle} color="bg-emerald-500" title="Document Signed" message="The document has been successfully signed. The sender has been notified." />;
  if (state === 'rejected') return <StatusPage icon={XCircle} color="bg-red-500" title="Document Rejected" message="You have declined to sign this document. The sender has been notified." />;
  if (state === 'expired') return <StatusPage icon={Clock} color="bg-slate-500" title="Link Expired" message="This signing link has expired. Please contact the document sender." />;
  if (state === 'error') return <StatusPage icon={XCircle} color="bg-red-500" title="Invalid Link" message="This signing link is invalid or no longer active." />;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0f17 0%, #1a1a2e 100%)' }}>
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(15,15,23,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl flex items-center justify-center">
            <Pen className="w-4 h-4 text-gray-900" />
          </div>
          <span className="font-display text-xl font-semibold text-white">SignatureFlow</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Secure Signing</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Doc info */}
        {document && (
          <div className="card border border-white/5 mb-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-red-500/20 flex-shrink-0">
                <Pen className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{document.title}</h1>
                <p className="text-slate-400 text-sm mt-1">Requested by: <span className="text-slate-200">{(document.owner as any)?.name}</span></p>
                {document.message && <p className="mt-2 text-slate-300 text-sm italic bg-white/5 rounded-lg px-4 py-2">"{document.message}"</p>}
              </div>
              <div className="flex items-center gap-2 text-amber-400 text-sm glass rounded-lg px-3 py-1.5">
                <Clock className="w-4 h-4" />
                <span>Awaiting signature</span>
              </div>
            </div>
          </div>
        )}

        {state === 'form' ? (
          <div className="max-w-md mx-auto animate-slide-up">
            <div className="card border border-white/5">
              <h2 className="text-xl font-bold text-white mb-2">Your Information</h2>
              <p className="text-slate-400 text-sm mb-6">Please confirm your details before signing</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                  <input value={signerInfo.name} onChange={e => setSignerInfo({...signerInfo, name: e.target.value})} className="input-field" placeholder="Your full name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input type="email" value={signerInfo.email} onChange={e => setSignerInfo({...signerInfo, email: e.target.value})} className="input-field" placeholder="your@email.com" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowRejectModal(true)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
                <button onClick={startSigning} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Pen className="w-4 h-4" /> Review & Sign
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 animate-fade-in">
            {/* PDF viewer */}
            <div className="flex-1">
              {document && (document as any).pageCount > 1 && (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="btn-secondary px-3 py-1 text-sm">Prev</button>
                  <span className="text-slate-300 text-sm">Page {currentPage} of {(document as any).pageCount}</span>
                  <button onClick={() => setCurrentPage(p => Math.min((document as any).pageCount, p+1))} disabled={currentPage === (document as any).pageCount} className="btn-secondary px-3 py-1 text-sm">Next</button>
                </div>
              )}
              <div className="flex justify-center">
                <div className="relative shadow-2xl">
                  <canvas ref={canvasRef} />
                  {!pdfLoaded && <div className="absolute inset-0 bg-white flex items-center justify-center min-h-64 min-w-64"><div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" /></div>}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-72 flex-shrink-0">
              <div className="card border border-white/5 sticky top-4">
                <h3 className="font-semibold text-white mb-4">Signing Options</h3>
                <div className="space-y-2 mb-6">
                  {[
                    { key: 'signature', label: 'Signature', desc: 'Full signature' },
                    { key: 'initials', label: 'Initials', desc: 'Initial letters' },
                    { key: 'stamp', label: 'Company Stamp', desc: 'Upload stamp image' },
                  ].map(item => {
                    const applied = signatures.find(s => s.category === item.key);
                    return (
                      <button key={item.key} onClick={() => { setSigCategory(item.key as any); setShowSigModal(true); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${applied ? 'border-emerald-400/50 bg-emerald-400/5 text-emerald-400' : 'border-white/10 text-slate-300 hover:border-amber-400/30'}`}>
                        <div className="text-left">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs opacity-60">{applied ? 'Applied ✓' : item.desc}</p>
                        </div>
                        {applied && applied.type !== 'typed' && <img src={applied.data} alt="" className="h-8 w-auto object-contain ml-2" />}
                        {applied && applied.type === 'typed' && <span className="text-sm italic ml-2">{applied.data}</span>}
                        {!applied && <Pen className="w-4 h-4 opacity-50" />}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <button onClick={submit} disabled={submitting || signatures.length === 0}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {submitting ? 'Signing...' : 'Sign Document'}
                  </button>
                  <button onClick={() => setShowRejectModal(true)} className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 transition-colors">
                    <XCircle className="w-4 h-4" /> Decline to Sign
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="w-3 h-3" />
                  <span>Your IP is logged for audit purposes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSigModal && <SignatureModal defaultCategory={sigCategory} signerName={signerInfo.name} onApply={handleApplySig} onClose={() => setShowSigModal(false)} />}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-light rounded-3xl w-full max-w-md p-8 animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-2">Decline to Sign</h3>
            <p className="text-slate-400 text-sm mb-6">Please provide a reason for declining</p>
            <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="input-field resize-none" rows={4} placeholder="I'm declining because..." />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={reject} disabled={submitting} className="flex-1 px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
