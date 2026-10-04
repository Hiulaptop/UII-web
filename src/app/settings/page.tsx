import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { DeleteAccount, RevokeLinksButton } from "@/components/settings/privacy-actions";
import { buttonVariants } from "@/components/ui/button";

const card = "rounded-[20px] bg-canvas-white p-8 md:p-10";
const h2 = "font-heading text-lg tracking-[-0.02em]";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) redirect("/login?callbackUrl=%2Fsettings");
  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Tài khoản</p>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Cài đặt</h1>
        </section>

        <section className="bg-ash py-[60px]">
          <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5">
            <div className={`${card} max-w-[700px]`}>
              <h2 className={h2}>Tài khoản</h2>
              <div className="mt-6 flex items-center gap-4">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-14 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="grid size-14 place-items-center rounded-full bg-ash font-heading text-lg">{initial}</span>
                )}
                <div>
                  <p className="text-lg">{user.name ?? user.email}</p>
                  <p className="text-sm text-slate">Đăng nhập bằng Google</p>
                </div>
              </div>
              <label className="mt-8 block space-y-2">
                <span className="text-[14px] text-steel">Email</span>
                <input readOnly value={user.email} className="h-11 w-full bg-fog px-2.5 text-base text-slate outline-none" />
              </label>
              <label className="mt-5 block space-y-2">
                <span className="text-[14px] text-steel">Ngôn ngữ</span>
                <select defaultValue="vi" className="h-11 w-full border border-graphite bg-canvas-white px-2.5 text-base">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en" disabled>English (sắp có)</option>
                </select>
              </label>
            </div>

            <div className={`${card} max-w-[700px]`}>
              <h2 className={h2}>Kết nối &amp; nhắc nhở</h2>
              <div className="mt-6 flex items-center justify-between gap-6 border-b border-mist pb-5">
                <div>
                  <p>Google Calendar</p>
                  <p className="text-sm text-slate">Nhắc uống thuốc trong một lịch riêng của UII.</p>
                </div>
                <Link href="/settings/google" className={buttonVariants({ variant: "outline" })}>Quản lý</Link>
              </div>
              <div className="mt-5 flex items-center justify-between gap-6">
                <div>
                  <p>Thông báo cảnh báo</p>
                  <p className="text-sm text-slate">Chọn kênh, loại và giờ yên lặng cho từng người bạn theo dõi.</p>
                </div>
                <Link href="/circle/notifications" className={buttonVariants({ variant: "outline" })}>Mở</Link>
              </div>
            </div>

            <div className={`${card} max-w-[700px]`}>
              <h2 className={h2}>Quyền riêng tư</h2>
              <div className="mt-6 flex items-center justify-between gap-6 border-b border-mist pb-5">
                <div>
                  <p>Tải dữ liệu của tôi</p>
                  <p className="text-sm text-slate">Nhận bản sao hồ sơ, cảnh báo và lịch sử truy cập.</p>
                </div>
                <a href="/settings/export" download className={buttonVariants({ variant: "outline" })}>Tải xuống</a>
              </div>
              <div className="mt-5 flex items-center justify-between gap-6">
                <div>
                  <p>Thu hồi mọi link SOS</p>
                  <p className="text-sm text-slate">Mọi mã QR đã chia sẻ sẽ ngừng hoạt động ngay.</p>
                </div>
                <RevokeLinksButton />
              </div>
            </div>

            <div className={`${card} max-w-[700px]`}>
              <h2 className={h2}>Xóa tài khoản</h2>
              <p className="mt-4 text-sm text-steel">
                Hành động này xóa vĩnh viễn hồ sơ SOS, cảnh báo, circle và thiết bị của bạn. Không thể hoàn tác.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <DeleteAccount email={user.email} />
                <a href="/settings/export" download className="text-sm underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                  Hãy tải dữ liệu của bạn trước khi xóa.
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
