import api from './api';
import { Document, SignatureField } from '../types';

export const documentService = {
  upload: (formData: FormData) => api.post<{ document: Document }>('/docs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  getAll: (status?: string) => api.get<{ documents: Document[]; total: number; stats: { _id: string; count: number }[] }>('/docs', {
    params: status && status !== 'all' ? { status } : undefined
  }),
  
  getById: (id: string) => api.get<{ document: Document }>(`/docs/${id}`),
  
  updateFields: (id: string, fields: SignatureField[]) => api.put<{ document: Document }>(`/docs/${id}/fields`, { fields }),
  
  generateSigningLink: (id: string, data: { signerEmail?: string; signerName?: string; message?: string }) =>
    api.post<{ signingLink: string; token: string; document: Document }>(`/docs/${id}/signing-link`, data),
  
  delete: (id: string) => api.delete(`/docs/${id}`),
  
  download: (id: string) => api.get(`/docs/${id}/download`, { responseType: 'blob' }),
};
