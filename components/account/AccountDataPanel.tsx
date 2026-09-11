"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteMyAccount, downloadMyData } from "@/lib/account/accountData";

export function AccountDataPanel({ email }: { email: string }) {
  const router = useRouter();
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadMyData();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not build your export.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteMyAccount(confirmEmail);
      // deleteMyAccount signs out, which clears the session in
      // SupabaseProvider, so this lands on the signed-out homepage.
      router.push("/");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete your account.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Download everything we hold about you as a JSON file. Access tokens are excluded — those are
        credentials rather than your data, and a downloaded file is the wrong place for them.
      </p>
      <Button variant="ghost" onClick={handleExport} disabled={isExporting}>
        {isExporting ? "Preparing…" : "Download my data"}
      </Button>
      {exportError && <p className="mt-3 text-sm text-warning">{exportError}</p>}

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-1 text-sm font-semibold text-foreground">Delete my account</p>
        <p className="mb-4 text-sm text-muted">
          This erases your profile, every health reading and your Strava connection, and cannot be
          undone. Any subscription is cancelled immediately — the remainder of a period you&apos;ve
          already paid for is not refunded. Thríamvos is also removed from your Strava connected apps.
        </p>

        {!isConfirming ? (
          <Button
            variant="ghost"
            className="border-danger text-danger hover:bg-danger/10"
            onClick={() => setIsConfirming(true)}
          >
            Delete my account
          </Button>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">
                Type <strong className="text-foreground">{email}</strong> to confirm
              </span>
              <Input
                type="email"
                autoComplete="off"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                placeholder={email}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-danger hover:bg-danger/90"
                onClick={handleDelete}
                disabled={isDeleting || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
              >
                {isDeleting ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsConfirming(false);
                  setConfirmEmail("");
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
            {deleteError && <p className="text-sm text-warning">{deleteError}</p>}
          </div>
        )}
      </div>
    </>
  );
}
