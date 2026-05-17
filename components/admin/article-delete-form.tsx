"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  deleteArticleAction,
  type ArticleFormState
} from "@/app/admin/articles/actions";

const initialState: ArticleFormState = {
  status: "idle",
  message: ""
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#b42318] bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#b42318] transition hover:bg-[#b42318] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังลบ..." : "ลบบทความ"}
    </button>
  );
}

export function ArticleDeleteForm({
  slug,
  title,
  redirectOnSuccess = false
}: {
  slug: string;
  title: string;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(deleteArticleAction, initialState);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (redirectOnSuccess) {
      router.push("/admin/articles");
    } else {
      router.refresh();
    }
  }, [redirectOnSuccess, router, state.status]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`ต้องการลบบทความ "${title}" ใช่ไหม? การลบนี้ย้อนกลับไม่ได้`)) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="slug" value={slug} />
      <DeleteButton />

      {state.message ? (
        <p
          className={`text-sm font-semibold ${
            state.status === "success" ? "text-[#207443]" : "text-[#b42318]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
