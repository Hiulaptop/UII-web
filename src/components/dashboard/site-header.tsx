import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/dashboard#alerts", label: "Cảnh báo" },
  { href: "/dashboard#sos", label: "Hồ sơ SOS" },
  { href: "/dashboard#circle", label: "Circle" },
];

export function SiteHeader({ userName }: { userName?: string | null }) {
  return (
    <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-6">
      <Link href="/dashboard" className="font-heading text-2xl tracking-[-0.02em]">
        UII
      </Link>

      <nav aria-label="Chính" className="order-3 w-full overflow-x-auto md:order-none md:w-auto">
        <ul className="flex w-max gap-5 rounded-full bg-ash px-[18px] py-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="font-heading text-base tracking-[-0.02em] text-graphite hover:text-steel">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-5">
        {userName && <span className="hidden text-sm text-slate sm:inline">{userName}</span>}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Đăng xuất
          </Button>
        </form>
      </div>
    </header>
  );
}
