"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import {
  deletePromotionAction,
  type PromotionFormState
} from "@/app/admin/promotions/actions";

const initialState: PromotionFormState = {
  status: "idle",
  message: ""
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[#b42318] bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#b42318] transition hover:bg-[#b42318] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังลบ..." : "ลบโปรโมชั่น"}
    </button>
  );
}

export function PromotionDeleteForm({
  promotionId,
  title,
  redirectOnSuccess = false
}: {
  promotionId: string;
  title: string;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(deletePromotionAction, initialState);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (redirectOnSuccess) {
      router.push("/admin/promotions");
    } else {
      router.refresh();
    }
  }, [redirectOnSuccess, router, state.status]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`ต้องการลบโปรโมชั่น "${title}" ใช่ไหม? การลบนี้ย้อนกลับไม่ได้`)) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="promotionId" value={promotionId} />
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
