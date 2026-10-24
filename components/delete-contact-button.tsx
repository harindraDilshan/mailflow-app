"use client";

import { useRef } from "react";

export function DeleteContactButton({
  action,
  contactId,
}: {
  action: (formData: FormData) => Promise<void>;
  contactId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm("Delete this contact? This action cannot be undone.")) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={action} className="mt-6">
      <input type="hidden" name="id" value={contactId} />
      <button
        type="button"
        onClick={handleClick}
        className="rounded border px-4 py-2 text-sm"
      >
        Delete contact
      </button>
    </form>
  );
}
