/**
 * Security display rules and input handling. Pure, so they are tested without
 * rendering. The backend enforces everything; this only makes it readable.
 */

import type { AlertType, MySecurityStatus } from "@/lib/api/types";

export const ALERT_LABEL: Record<AlertType, string> = {
  multi_device: "Tried a second phone",
  shared_device: "Phone belongs to another student",
  wrong_device: "Marked from the wrong phone",
  invalid_signature: "Request failed verification",
};

export function alertLabel(type: string): string {
  return ALERT_LABEL[type as AlertType] ?? type;
}

/**
 * Normalise what someone typed or pasted into a code box: "123 456",
 * "123-456" and a code copied with a trailing newline all become "123456".
 * Returns null when it cannot be a six-digit code.
 */
export function normaliseOtp(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** "Resend in 42s" / "Resend code". */
export function resendLabel(secondsLeft: number): string {
  return secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code";
}

export function blockFor(
  status: Pick<MySecurityStatus, "blocks"> | null,
  classroomId: string,
): MySecurityStatus["blocks"][number] | null {
  return status?.blocks.find((b) => b.classroom_id === classroomId) ?? null;
}
