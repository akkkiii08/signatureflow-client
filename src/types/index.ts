export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  company?: string;
  createdAt: string;
}

export interface SignatureField {
  id: string;
  type: 'signature' | 'initials' | 'stamp' | 'name' | 'date' | 'text';
  x: number; // percentage
  y: number; // percentage
  width: number;
  height: number;
  page: number;
  required: boolean;
  label?: string;
  value?: string;
}

export interface Document {
  _id: string;
  title: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  owner: User | string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  signerEmail?: string;
  signerName?: string;
  signatureFields: SignatureField[];
  signedFilePath?: string;
  signingToken?: string;
  tokenExpiry?: string;
  rejectionReason?: string;
  message?: string;
  pageCount: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureData {
  type: 'typed' | 'drawn' | 'uploaded';
  category: 'signature' | 'initials' | 'stamp';
  data: string; // base64 or text
  fontStyle?: string;
  color?: string;
  fields: { fieldId: string; x: number; y: number; page: number; width: number; height: number; }[];
}

export interface AuditLog {
  _id: string;
  document: string;
  action: string;
  actor?: User;
  actorEmail?: string;
  actorName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export type DocumentStatus = 'all' | 'pending' | 'signed' | 'rejected' | 'expired';
