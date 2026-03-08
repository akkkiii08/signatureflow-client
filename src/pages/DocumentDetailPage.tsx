import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/documentService';
import { Document, AuditLog } from '../types';
import Navbar from '../components/ui/Navbar';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ArrowLeft, Edit3, Link as LinkIcon, Download, Clock, CheckCircle, XCircle, Shield, Calendar, User, Globe, FileText } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  document_created: { label: 'Document Created', icon: FileText, color: 'text-blue-400' },
  document_viewed: { label: 'Document Viewed', icon: User, color: 'text-slate-400' },
  signing_link_generated: { label: 'Signing Link Generated', icon: LinkIcon, color: 'text-indigo-400' },
  document_opened: { label: 'Document Opened by Signer', icon: Globe, color: 'text-cyan-400' },
  signature_placed: { label: 'Signature Placed', icon: Edit3, color: 'text-yellow-400' },
  document_signed: { label: 'Document Signed', icon: CheckCircle, color: 'text-emerald-400' },
  document_rejected: { label: 'Document Rejected', icon: XCircle, color: 'text-red-400' },
  document_downloaded: { label: 'Document Downloaded', icon: Download, color: 'text-purple-400' },
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingLink, setSigningLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ signerEmail: '', signerName: '', message: '' });
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, auditRes] = await Promise.all([
          documentService.getById(id!),
          api.get(`/audit/${id}`)
        ]);
        setDocument(docRes.data.document);
        setLogs(auditRes.data.logs);
        if (docRes.data.document.signerEmail) {
          setLinkForm(prev => ({ ...prev, signerEmail: docRes.data.document.signerEmail || '', signerName: docRes.data.document.signerName || '' }));
        }
      } catch { toast.error('Failed to load document'); navigate('/dashboard'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const { data } = await documentService.generateSigningLink(id!, linkForm);
      setSigningLink(data.signingLink);
      setDocument(data.document);
      toast.success('Signing link generated!');
      setShowLinkModal(false);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to generate link'); }
    finally { setGeneratingLink(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(signingLink || `${window.location.origin}/sign/${document?.signingToken}`); toast.success('Link copied!'); };

  const download = async () => {
    try {
      const res = await documentService.download(id!);
      const url = URL.createObjectURL(res.data);
      const a = window.document.createElement('a'); a.href = url; a.download = `${document?.title}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download'); }
  };

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#0f0f17' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="card h-96 animate-pulse" />
      </div>
    </div>
  );

  if (!document) return null;

  const statusConf = { pending: { icon: Clock, cls: 'status-pending', label: 'Pending' }, signed: { icon: CheckCircle, cls: 'status-signed', label: 'Signed' }, rejected: { icon: XCircle, cls: 'status-rejected', label: 'Rejected' }, expired: { icon: Clock, cls: 'status-expired', label: 'Expired' } };
  const status = statusConf[document.status];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0f17 0%, #1a1a2e 100%)' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 text-sm truncate">{document.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main card */}
          <div className="lg:col-span-2 space-y-6 animate-slide-up">
            <div className="card border border-white/5">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-red-500/20 flex-shrink-0">
                  <FileText className="w-7 h-7 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-white mb-1 truncate">{document.title}</h1>
                  <p className="text-slate-400 text-sm">{document.originalName}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${status.cls}`}>
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-500">{document.pageCount} page{document.pageCount !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-slate-500">{document.fileSize ? (document.fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {document.status === 'pending' && (
                  <Link to={`/docs/${document._id}/edit`} className="btn-primary flex items-center gap-2 text-sm">
                    <Edit3 className="w-4 h-4" /> Edit & Place Signatures
                  </Link>
                )}
                {document.signingToken && document.status === 'pending' && (
                  <button onClick={copyLink} className="btn-secondary flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4" /> Copy Signing Link
                  </button>
                )}
                {!document.signingToken && document.status === 'pending' && (
                  <button onClick={() => setShowLinkModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4" /> Generate Signing Link
                  </button>
                )}
                {(document.signedFilePath || document.filePath) && (
                  <button onClick={download} className="btn-secondary flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" /> Download {document.signedFilePath ? 'Signed PDF' : 'PDF'}
                  </button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="card border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Document Details</h3>
              <div className="space-y-3">
                {[
                  { label: 'Created', value: format(new Date(document.createdAt), 'PPP') },
                  { label: 'Signer', value: document.signerName || '—' },
                  { label: 'Signer Email', value: document.signerEmail || '—' },
                  { label: 'Signature Fields', value: `${document.signatureFields.length} field${document.signatureFields.length !== 1 ? 's' : ''}` },
                  ...(document.completedAt ? [{ label: 'Completed', value: format(new Date(document.completedAt), 'PPP p') }] : []),
                  ...(document.rejectionReason ? [{ label: 'Rejection Reason', value: document.rejectionReason }] : []),
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between gap-4">
                    <span className="text-slate-500 text-sm">{item.label}</span>
                    <span className="text-slate-200 text-sm text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit trail */}
          <div className="animate-slide-up">
            <div className="card border border-white/5 h-full">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Audit Trail</h3>
              </div>
              {logs.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No activity yet</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {logs.map((log, i) => {
                    const conf = ACTION_LABELS[log.action] || { label: log.action, icon: Clock, color: 'text-slate-400' };
                    return (
                      <div key={log._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center ${conf.color}`}>
                            <conf.icon className="w-3.5 h-3.5" />
                          </div>
                          {i < logs.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className={`text-sm font-medium ${conf.color}`}>{conf.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.actorName || log.actorEmail || 'System'}</p>
                          {log.ipAddress && <p className="text-xs text-slate-600 mt-0.5 font-mono">{log.ipAddress}</p>}
                          <p className="text-xs text-slate-600 mt-0.5">{format(new Date(log.timestamp), 'PPp')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Generate Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-light rounded-3xl w-full max-w-md shadow-2xl p-8 animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-6">Generate Signing Link</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Signer Name</label><input value={linkForm.signerName} onChange={e => setLinkForm({...linkForm, signerName: e.target.value})} className="input-field" placeholder="Jane Doe" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Signer Email</label><input type="email" value={linkForm.signerEmail} onChange={e => setLinkForm({...linkForm, signerEmail: e.target.value})} className="input-field" placeholder="jane@company.com" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Message (optional)</label><textarea value={linkForm.message} onChange={e => setLinkForm({...linkForm, message: e.target.value})} className="input-field resize-none" rows={2} placeholder="Please review and sign..." /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLinkModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={generateLink} disabled={generatingLink} className="btn-primary flex-1">{generatingLink ? 'Generating...' : 'Generate Link'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
