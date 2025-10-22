export type FileEntry = { path: string; contents: string; updatedAt: number };
export type Snapshot = {
  id: string;
  label: string;
  createdAt: number;
  files: FileEntry[];
};

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  files: FileEntry[];
  snapshots: Snapshot[];
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
  ts: number;
};
export type ChatThread = {
  id: string;
  projectId: string;
  providerId: string;
  modelId: string;
  messages: ChatMessage[];
};

export type ProviderKey = {
  providerId: string;
  encrypted: string;
  storedAt: number;
  validated?: boolean;
};
