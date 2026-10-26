"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * useActionState for a <form onSubmit={onSubmit}>.
 * A plain <form action={...}> makes React clear every field after the action ends,
 * also when the action returns an error. Then the user must type everything again.
 * This hook sends the same FormData (with the clicked submit button) but keeps the fields.
 */
export function useActionForm<S>(
  action: (state: Awaited<S>, formData: FormData) => S | Promise<S>,
  initialState: Awaited<S>
) {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const [, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, onSubmit };
}
