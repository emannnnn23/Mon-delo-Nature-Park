import type { ReactNode } from "react";

import { AdminModal } from "~/admin/components/AdminModal";
import type { ContentForm } from "~/admin/hooks/useContentForm";
import { Button } from "~/components/common/Button";

type ContentDialogProps = {
  title: string;
  form: Pick<
    ContentForm<object, string>,
    | "busy"
    | "restored"
    | "message"
    | "formRef"
    | "messageRef"
    | "submit"
    | "dropDraft"
    | "discardDraft"
  >;
  onClose: () => void;
  children: ReactNode;
};

/**
 * The frame of an add/edit dialog driven by `useContentForm`: the notice that
 * a draft was restored (with a way to discard it), a failure message, the
 * fields, then Save and Cancel. Cancel throws the draft away; closing with
 * Escape, the backdrop or the close button keeps it for next time.
 */
export function ContentDialog({
  title,
  form,
  onClose,
  children,
}: ContentDialogProps) {
  const {
    busy,
    restored,
    message,
    formRef,
    messageRef,
    submit,
    dropDraft,
    discardDraft,
  } = form;
  return (
    <AdminModal title={title} busy={busy} onClose={onClose}>
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-5"
      >
        {restored ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p role="status" className="font-semibold text-earth-700">
              We restored your unsaved changes from this device. Save to keep
              them.
            </p>
            <Button
              type="button"
              variant="outline-dark"
              disabled={busy}
              onClick={discardDraft}
            >
              Discard draft
            </Button>
          </div>
        ) : null}
        {message ? (
          <p
            ref={messageRef}
            tabIndex={-1}
            role="alert"
            className="font-semibold text-red-700 focus:outline-none"
          >
            {message}
          </p>
        ) : null}
        {children}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline-dark"
            disabled={busy}
            onClick={() => {
              dropDraft();
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
