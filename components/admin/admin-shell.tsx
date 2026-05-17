import Link from "next/link";
import type { ReactNode } from "react";

type AdminShellProps = {
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  matchPrefixes: string[];
};

const navItems: NavItem[] = [
  { href: "/admin", label: "สินค้า", matchPrefixes: ["/admin/products"] },
  { href: "/admin/orders", label: "คำสั่งซื้อ", matchPrefixes: ["/admin/orders"] },
  { href: "/admin/articles", label: "บทความ", matchPrefixes: ["/admin/articles"] },
  { href: "/admin/promotions", label: "โปรโมชั่น", matchPrefixes: ["/admin/promotions"] },
  { href: "/admin/b2b", label: "ลูกค้า B2B", matchPrefixes: ["/admin/b2b"] },
  { href: "/admin/payments", label: "การชำระเงิน", matchPrefixes: ["/admin/payments"] },
  { href: "/admin/accounts", label: "บัญชีผู้ใช้", matchPrefixes: ["/admin/accounts"] }
];

function isCurrentPath(currentPath: string, item: NavItem) {
  return currentPath === item.href || item.matchPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
}

export const adminSecondaryActionClass =
  "rounded-full border border-[#d8cec0] bg-white px-5 py-3 text-sm font-bold text-[#171212] transition hover:bg-[#faf5ed]";

export const adminPrimaryActionClass =
  "rounded-full bg-[#171212] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2b2424]";

export function AdminShell({
  currentPath,
  eyebrow,
  title,
  description,
  actions,
  children
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-hero-glow px-3 py-6 sm:px-4 sm:py-10">
      <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 rounded-[28px] border border-[#e9dfd1] bg-white px-4 py-6 shadow-card sm:px-6 sm:py-8 xl:px-8 xl:py-10">
        <div className="overflow-hidden rounded-[30px] border border-[#e8ddcd] bg-[linear-gradient(135deg,#fffaf3_0%,#ffffff_52%,#f5f8ff_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="max-w-4xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#171212] sm:text-4xl xl:text-[2.8rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#625b54]">{description}</p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              {actions}
              <Link className={adminSecondaryActionClass} href="/">
                กลับหน้าหลัก
              </Link>
            </div>
          </div>

          <div className="border-t border-[#ece4d6] px-5 py-4 sm:px-7">
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = isCurrentPath(currentPath, item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-[#171212] text-white"
                        : "border border-[#ddd3c5] bg-white text-[#171212] hover:bg-[#faf5ed]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="space-y-6">{children}</div>
      </section>
    </main>
  );
}
