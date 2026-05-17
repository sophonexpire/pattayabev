"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  deleteProductAction,
  type ProductFormState
} from "@/app/admin/actions";

const initialState: ProductFormState = {
  status: "idle",
  message: ""
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b42318] bg-white px-5 text-sm font-bold uppercase tracking-[0.12em] text-[#b42318] transition hover:bg-[#b42318] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังลบ..." : "ลบสินค้า"}
    </button>
  );
}

export function ProductDeleteForm({
  productId,
  productSlug,
  productName,
  redirectOnSuccess = false
}: {
  productId: string;
  productSlug: string;
  productName: string;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(deleteProductAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      if (redirectOnSuccess) {
        router.push("/admin");
      } else {
        router.refresh();
      }
    }
  }, [redirectOnSuccess, router, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(`ต้องการลบสินค้า "${productName}" ใช่ไหม? การลบนี้ย้อนกลับไม่ได้`);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
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
