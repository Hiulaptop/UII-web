import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { ProfileForm } from "@/components/sos/profile-form";
import { loadProfile } from "@/lib/sos/service";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fprofile");
  const initial = await loadProfile(session.user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Hồ sơ SOS</p>
          <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[56px] md:leading-[0.95]">
            Những điều người cấp cứu cần biết.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            Chỉ những ai có mã QR của bạn mới xem được thẻ này, và chỉ gồm các mục dưới đây. Email và lịch sử cảnh báo không bao giờ hiện trên thẻ.
          </p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            <Link href="/profile/qr" className="text-steel underline hover:text-graphite">Tạo và quản lý mã QR</Link>
            <Link href="/profile/medications" className="text-steel underline hover:text-graphite">Lịch uống thuốc</Link>
          </div>
        </section>
        <section className="bg-ash py-[60px]">
          <div className="mx-auto w-full max-w-[800px] px-5">
            <ProfileForm initial={initial} />
          </div>
        </section>
      </main>
    </div>
  );
}
