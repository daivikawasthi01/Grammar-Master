export interface Document {
  _id: string;
  title: string;
  status: string;
  text?: string;
}

export interface User {
  _id: string;
  email: string;
  documents: Document[];
}

export interface PollingData {
  _id: string;
  email: string;
  documents: Document[];
} 