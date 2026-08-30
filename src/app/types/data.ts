export interface Document {
  _id: string;
  title: string;
  status: string;
  text?: string;
  language?: string;
}

export interface User {
  _id: string;
  email: string;
  documents: Document[];
}

export interface PollingData {
  _id: string;
  name?: string;
  email: string;
  plan?: string;
  prompts?: number;
  trashs?: Document[];
  documents: Document[];
}