import { Document } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, Trash2, Eye, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { documentService } from '../../services/documentService';
import toast from 'react-hot-toast';
import { useState } from 'react';

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', cls: 'status-pending' },
  signed: { icon: CheckCircle, label: 'Signed', cls: 'status-signed' },
  rejected: { icon: XCircle, label: 'Rejected', cls: 'status-rejected' },
  expired: { icon: Clock, label: 'Expired', cls: 'status-expired' },
};

interface Props {
  document: Document;
  onUpdate: () => void;
  onClick: () => void;
}

export default function DocumentCard({ document: doc, onUpdate, onClick }: Props) {
  const [deleting, setDeleting] = useState(false);
  const status = statusConfig[doc.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    setDeleting(true);
    try {
      await documentService.delete(doc._id);
      toast.success('Document deleted');
      onUpdate();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const fileSize = doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';

  return (
    <div onClick={onClick} className="card cursor-pointer group border border-white/5 hover:border-amber-400/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-red-500/20">
          <FileText className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.cls}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
      </div>
      
      <h3 className="font-semibold text-white mb-1 truncate group-hover:text-amber-400 transition-colors">{doc.title}</h3>
      <p className="text-xs text-slate-500 mb-4 truncate">{doc.originalName}</p>
      
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span>{doc.pageCount || 1} page{doc.pageCount !== 1 ? 's' : ''}</span>
        <span>{fileSize}</span>
        {doc.signerEmail && <span className="truncate">→ {doc.signerEmail}</span>}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className="text-xs text-slate-500">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {doc.signingToken && (
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/sign/${doc.signingToken}`); toast.success('Link copied!'); }}
              className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors" title="Copy signing link">
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
