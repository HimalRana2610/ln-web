import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AttendanceRecord, AttendanceSession } from "@/lib/api/types";

import { AttendancePanel } from "../attendance-panel";

const actions = vi.hoisted(() => ({
  fetchSessions: vi.fn(),
  fetchRecords: vi.fn(),
  fetchVerifications: vi.fn(),
  correctRecord: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/app/(app)/classroom/[classroomId]/attendance-actions", () => actions);

function session(overrides: Partial<AttendanceSession> = {}): AttendanceSession {
  return {
    id: "s1",
    classroom_id: "c1",
    started_by: "t1",
    started_by_name: "Grace Hopper",
    date: "2026-09-14",
    status: "ended",
    started_at: "2026-09-14T03:15:00Z",
    verification_opens_at: "2026-09-14T03:20:00Z",
    ended_at: "2026-09-14T04:00:00Z",
    latitude: null,
    longitude: null,
    radius_meters: 15,
    threshold_minutes: 5,
    rssi_threshold: -80,
    hop_depth: 2,
    session_tag: "12345678",
    window_seconds: 30,
    server_time: "2026-09-14T05:00:00Z",
    beacon_secret: null,
    present_count: 1,
    record_count: 2,
    my_status: null,
    ...overrides,
  };
}

const record: AttendanceRecord = {
  id: "r1",
  session_id: "s1",
  student_id: "u1",
  student_name: "Alan Turing",
  student_email: "alan@example.edu",
  status: "present",
  marked_at: "2026-09-14T03:30:00Z",
  corrected: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.fetchRecords.mockResolvedValue({ ok: true, data: [record] });
});

describe("AttendancePanel", () => {
  it("gives teachers the export, correction and evidence controls", async () => {
    render(<AttendancePanel classroomId="c1" initialSessions={[session()]} canManage />);

    expect(screen.getByRole("link", { name: "Download spreadsheet" })).toHaveAttribute(
      "href",
      "/api/attendance/c1/export",
    );
    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Absent" })).toBeEnabled();
    expect(screen.getByText("MANUAL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verification attempts/ })).toBeInTheDocument();
  });

  it("gives students none of them", async () => {
    render(
      <AttendancePanel
        classroomId="c1"
        initialSessions={[session({ my_status: "present" })]}
        canManage={false}
      />,
    );

    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Download spreadsheet" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Absent" })).toBeNull();
    expect(screen.queryByRole("button", { name: /verification attempts/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "End session" })).toBeNull();
    expect(screen.getByText("You: Present")).toBeInTheDocument();
  });

  it("offers End session only while a session is open", async () => {
    const { unmount } = render(
      <AttendancePanel
        classroomId="c1"
        initialSessions={[session({ status: "active", ended_at: null })]}
        canManage
      />,
    );
    await waitFor(() => expect(actions.fetchRecords).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "End session" })).toBeInTheDocument();
    unmount();

    render(<AttendancePanel classroomId="c1" initialSessions={[session()]} canManage />);
    await waitFor(() => expect(screen.getByText("Alan Turing")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "End session" })).toBeNull();
  });

  it("marks the days that have sessions on the calendar", () => {
    render(<AttendancePanel classroomId="c1" initialSessions={[session()]} canManage />);
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-09-14, 1 session" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "2026-09-15" })).toBeDisabled();
  });

  it("explains that attendance is empty rather than rendering a blank calendar", () => {
    render(<AttendancePanel classroomId="c1" initialSessions={[]} canManage />);
    expect(screen.getByText(/No attendance has been taken/)).toBeInTheDocument();
    expect(actions.fetchRecords).not.toHaveBeenCalled();
  });
});
