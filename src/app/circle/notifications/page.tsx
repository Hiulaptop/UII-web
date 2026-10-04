import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrefsForm } from "@/components/circle/prefs-form";
import { SiteHeader } from "@/components/dashboard/site-header";
import { mailConfigured } from "@/lib/notify/mail";
import { listMyPrefs } from "@/lib/notify/prefs";

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fcircle%2Fnotifications");
  const items = await listMyPrefs(session.user.id);
  const mailEnabled = mailConfigured();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <Link href="/circle" className="text-sm text-steel hover:text-graphite">
            ← Circle
          </Link>
          <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[56px] md:leading-[0.95]">
            Cách bạn nhận cảnh báo.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">Chọn riêng cho từng người bạn đang theo dõi.</p>
        </section>
        <section className="bg-ash py-[60px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-2">
            {items.length ? (
              items.map((i) => <PrefsForm key={i.circleId} item={i} mailEnabled={mailEnabled} />)
            ) : (
              <p className="rounded-[20px] bg-canvas-white p-8 text-steel">
                Bạn chưa theo dõi ai. Khi chấp nhận lời mời vào circle của người thân, cài đặt sẽ hiện ở đây.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
