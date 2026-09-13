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

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export type SessionStatus = "monitoring" | "active" | "ended";
export type RecordStatus = "pending" | "present" | "absent";

export interface AttendanceSession {
  id: string;
  classroom_id: string;
  started_by: string;
  started_by_name: string;
  /** The classroom's calendar day, `YYYY-MM-DD`. Not an instant. */
  date: string;
  /** Effective: a monitoring session past its opening time reads `active`. */
  status: SessionStatus;
  started_at: string;
  verification_opens_at: string;
  ended_at: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  threshold_minutes: number;
  rssi_threshold: number;
  hop_depth: number;
  session_tag: string;
  window_seconds: number;
  server_time: string;
  /** Teachers only. The web app never uses it — only phones advertise. */
  beacon_secret: string | null;
  present_count: number;
  record_count: number;
  /** Students only. */
  my_status: RecordStatus | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: RecordStatus;
  marked_at: string | null;
  /** Set by a teacher's manual correction rather than by verification. */
  corrected: boolean;
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export interface OtpSent {
  sent_to: string;
  resend_after_seconds: number;
}

export interface DeviceInfo {
  id: string;
  platform: "android" | "ios";
  model: string | null;
  bound_at: string;
  last_seen_at: string;
}

export interface BlockInfo {
  classroom_id: string;
  classroom_name: string;
  reason: string | null;
  blocked_at: string;
}

export interface MySecurityStatus {
  email_verified: boolean;
  device: DeviceInfo | null;
  face_enrolled: boolean;
  blocks: BlockInfo[];
}

export interface StudentSecurity {
  student_id: string;
  full_name: string;
  email: string;
  email_verified: boolean;
  device: DeviceInfo | null;
  face_enrolled: boolean;
  blocked: boolean;
  block_reason: string | null;
  unread_alerts: number;
}

export type AlertType = "multi_device" | "shared_device" | "wrong_device" | "invalid_signature";

export interface SecurityAlert {
  id: string;
  classroom_id: string;
  classroom_name: string;
  student_id: string;
  student_name: string;
  student_email: string;
  type: AlertType;
  severity: "medium" | "critical";
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface FaceStatus {
  available: boolean;
  enrolled: boolean;
  enrolled_at: string | null;
}

export interface VerificationAttempt {
  id: string;
  student_id: string;
  student_name: string;
  created_at: string;
  accepted: boolean;
  rejection_reason: string | null;
  avg_rssi: number | null;
  hop_count: number | null;
  valid_windows: number;
  elapsed_windows: number;
}

// ---------------------------------------------------------------------------
// To-do
// ---------------------------------------------------------------------------

/** Computed by the server, so a phone with a wrong clock cannot misreport it. */
export type ToDoStatus = "assigned" | "missing" | "done";

export interface ToDoItem {
  post_id: string;
  classroom_id: string;
  classroom_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  author_name: string;
  created_at: string;
  submitted_at: string | null;
  is_late: boolean;
  status: ToDoStatus;
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export type QuizOption = "A" | "B" | "C" | "D";

export interface QuizQuestion {
  id: string;
  classroom_id: string;
  prompt: string;
  /** Always four, in A–D order. */
  options: string[];
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
  /** Hidden from students while the question is live. */
  correct_option: QuizOption | null;
  answer_count: number;
  my_option: QuizOption | null;
  my_is_correct: boolean | null;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  correct: number;
  answered: number;
  penalty_seconds: number;
}

export interface QuizState {
  active: QuizQuestion | null;
  /** Ended questions, newest first. */
  recent: QuizQuestion[];
  /** Already ranked by the server. */
  leaderboard: LeaderboardEntry[];
  poll_interval_seconds: number;
}

export interface QuizAnswerResult {
  option: QuizOption;
  is_correct: boolean;
  penalty_seconds: number;
}
