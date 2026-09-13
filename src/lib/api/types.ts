/**
 * Types mirroring the backend's Pydantic schemas.
 *
 * Hand-written for now. Once the API stabilises these should be generated from
 * `/openapi.json` so the two can never drift — see the README.
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  institute: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** Access-token lifetime in seconds. */
  expires_in: number;
}

/** Every backend failure uses this envelope. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  institute?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Classrooms
// ---------------------------------------------------------------------------

export type ClassroomType = "personal" | "public";
export type MemberRole = "owner" | "teacher" | "student";

export interface Classroom {
  id: string;
  name: string;
  section: string | null;
  code: string;
  type: ClassroomType;
  /** Tailwind gradient pair, e.g. "from-blue-500 to-indigo-600". */
  theme_color: string;
  owner_id: string;
  owner_name: string;
  /** The viewing user's role in this classroom. */
  my_role: MemberRole;
  member_count: number;
  created_at: string;
}

export interface ClassroomMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: MemberRole;
  joined_at: string;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export type NoteStatus = "pending" | "processing" | "ready" | "failed";
export type NoteSourceType = "audio" | "text" | "pdf" | "youtube";

/** List view — deliberately has no `markdown`, which the backend omits. */
export interface NoteSummary {
  id: string;
  classroom_id: string;
  date: string;
  title: string;
  status: NoteStatus;
  source_type: NoteSourceType;
  author_id: string;
  author_name: string;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface Note extends NoteSummary {
  markdown: string;
}

export interface PresignedUpload {
  asset_id: string;
  upload_url: string;
  /** Must be sent as the Content-Type header on the PUT, or the signature fails. */
  content_type: string;
  expires_in: number;
}

/** A note is still being generated while its status is one of these. */
export const IN_PROGRESS_STATUSES: readonly NoteStatus[] = ["pending", "processing"];

// ---------------------------------------------------------------------------
// Posts, submissions and downloads
// ---------------------------------------------------------------------------

export type PostKind = "material" | "announcement" | "assignment";
export type UploadPurpose = "note" | "attachment";

/** A file's metadata. Never a URL — those expire, so ask for one per download. */
export interface AssetInfo {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number | null;
}

export interface Post {
  id: string;
  classroom_id: string;
  kind: PostKind;
  title: string;
  description: string | null;
  /** ISO 8601 with offset. Assignments only. */
  due_date: string | null;
  author_id: string;
  author_name: string;
  asset: AssetInfo | null;
  created_at: string;
  updated_at: string;
  /** Assignments, teacher view. */
  submission_count: number | null;
  /** Assignments, student view. Null until they submit. */
  my_submitted_at: string | null;
}

export interface Submission {
  id: string;
  post_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  asset: AssetInfo;
  submitted_at: string;
  is_late: boolean;
}

export interface DownloadLink {
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number | null;
  expires_in: number;
}
