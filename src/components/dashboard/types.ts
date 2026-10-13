// Shared types for the PMKP Dashboard.
//
// These mirror the shapes returned by the API routes
// (/api/standards, /api/documents, /api/documents/[id], /api/stats,
// /api/activities) so the same types can be used for both the server-
// rendered initial data and the client-side re-fetches.

export type StatusKey = "todo" | "prog" | "review" | "done" | "block";
export type Priority = "Tinggi" | "Sedang" | "Rendah";

export interface StandardInfo {
  id: string;
  code: string; // "PMKP 1"
  title: string;
  description?: string | null;
  color: string; // hex string
  sortOrder: number;
}

export interface StandardStats {
  total: number;
  done: number;
  prog: number;
  todo: number;
  block: number;
  pct: number;
  overdue: number;
}

export interface StandardWithStats extends StandardInfo {
  stats: StandardStats;
}

export interface DocActivity {
  id: string;
  actor: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  message: string;
  createdAt: string; // ISO
}

export interface PmkpDocument {
  id: string;
  stdCode: string; // "PMKP 1a"
  standardId: string;
  standard: StandardInfo | null;
  subTopic: string;
  title: string;
  description?: string | null;
  pic?: string | null;
  status: StatusKey;
  progress: number; // 0..100
  priority: Priority;
  dueDate?: string | null; // ISO
  pendukung: string[];
  admin: string[];
  regulasi: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PmkpDocumentDetail extends PmkpDocument {
  activities: DocActivity[];
}

export interface StatsByStatus {
  done: number;
  review: number;
  prog: number;
  todo: number;
  block: number;
}

export interface StatsActivity {
  id: string;
  actor: string;
  action: string;
  message: string;
  createdAt: string;
  docTitle?: string | null;
  stdCode?: string | null;
}

export interface UpcomingDoc {
  id: string;
  title: string;
  stdCode: string;
  pic?: string | null;
  status: StatusKey;
  progress: number;
  dueDate?: string | null;
  color?: string | null;
}

export interface DashboardStats {
  total: number;
  byStatus: StatsByStatus;
  avgProgress: number;
  overdue: number;
  activities: StatsActivity[];
  upcoming: UpcomingDoc[];
}

export interface FilterState {
  standard: string; // "all" or sortOrder as string ("1".."11")
  status: "all" | StatusKey;
  priority: "all" | Priority;
  pic: string; // "all" or PIC string
  q: string;
  sort: "due" | "progress" | "std"; // Tenggat terdekat | Progress tertinggi | Standar A→Z
}

export const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; bg: string; text: string; dot: string }
> = {
  done: {
    label: "Selesai",
    color: "#10b981",
    bg: "#dcfce7",
    text: "#166534",
    dot: "#16a34a",
  },
  review: {
    label: "Review",
    color: "#f59e0b",
    bg: "#fef3c7",
    text: "#92400e",
    dot: "#f59e0b",
  },
  prog: {
    label: "Proses",
    color: "#38bdf8",
    bg: "#dbeafe",
    text: "#1e40af",
    dot: "#3b82f6",
  },
  todo: {
    label: "Belum",
    color: "#94a3b8",
    bg: "#f1f5f9",
    text: "#475569",
    dot: "#94a3b8",
  },
  block: {
    label: "Blokir",
    color: "#fb7185",
    bg: "#fee2e2",
    text: "#991b1b",
    dot: "#ef4444",
  },
};

export const STATUS_ORDER: StatusKey[] = [
  "done",
  "review",
  "prog",
  "todo",
  "block",
];

export const PRIORITY_LIST: Priority[] = ["Tinggi", "Sedang", "Rendah"];

export const PRIORITY_META: Record<
  Priority,
  { text: string; bg: string }
> = {
  Tinggi: { text: "text-rose-600", bg: "bg-rose-50" },
  Sedang: { text: "text-amber-600", bg: "bg-amber-50" },
  Rendah: { text: "text-slate-500", bg: "bg-slate-100" },
};

export type ViewMode = "grid" | "list" | "kanban" | "gantt";
