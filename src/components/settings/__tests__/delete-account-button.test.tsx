import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteAccountButton } from "../delete-account-button";

const actions = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  updateProfile: vi.fn(),
  registerPushToken: vi.fn(),
  removePushToken: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("@/app/(app)/settings/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

beforeEach(() => vi.clearAllMocks());

describe("DeleteAccountButton", () => {
  it("cannot delete without a password", () => {
    render(<DeleteAccountButton />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByRole("button", { name: "Delete forever", hidden: true })).toBeDisabled();
    expect(actions.deleteAccount).not.toHaveBeenCalled();
  });

  it("shows the backend's error for a wrong password and stays put", async () => {
    actions.deleteAccount.mockResolvedValue({
      ok: false,
      error: "Password is incorrect",
      code: "invalid_credentials",
    });
    render(<DeleteAccountButton />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete forever", hidden: true }));

    await waitFor(() => expect(screen.getByText("Password is incorrect")).toBeInTheDocument());
    expect(actions.deleteAccount).toHaveBeenCalledWith("wrong");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes to the login page once the account is gone", async () => {
    actions.deleteAccount.mockResolvedValue({ ok: true, data: undefined });
    render(<DeleteAccountButton />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete forever", hidden: true }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
