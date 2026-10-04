import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { LinkForm } from "@/components/sos/link-form";
import { Button } from "@/components/ui/button";
import { isActive, listLinks } from "@/lib/sos/service";
import { revokeLinkAction } from "../actions";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function QrPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fprofile%2Fqr");
  const links = await listLinks(session.user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <Link href="/profile" className="text-sm text-steel hover:text-graphite">
            ← Hồ sơ SOS
          </Link>
          <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[56px] md:leading-[0.95]">
            Mã QR cho người cấp cứu.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            Quét mã là xem được thẻ SOS, không cần đăng nhập. Ai cầm mã đều xem được, nên chỉ in cho nơi bạn tin tưởng và thu hồi ngay khi mất.
          </p>
        </section>
        <section className="bg-ash py-[60px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-2">
            <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
              <LinkForm />
            </div>
            <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
              <h2 className="font-heading text-lg tracking-[-0.02em]">Các mã đã tạo ({links.length})</h2>
              {links.length ? (
                <ul className="mt-5 divide-y divide-mist">
                  {links.map((l) => {
                    const active = isActive(l);
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-5 py-4">
                        <div>
                          <p className="text-graphite">
                            Tạo {dt.format(new Date(l.created_at))} ·{" "}
                            {l.revoked_at ? "Đã thu hồi" : !active ? "Đã hết hạn" : l.expires_at ? `hết hạn ${dt.format(new Date(l.expires_at))}` : "không hết hạn"}
                          </p>
                          <p className="text-sm text-slate">
                            {l.views ? `${l.views} lượt xem · gần nhất ${dt.format(new Date(l.last_view!))}` : "Chưa có ai quét"}
                          </p>
                        </div>
                        {active && (
                          <form action={revokeLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Thu hồi
                            </Button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-5 text-steel">Chưa có mã nào.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
