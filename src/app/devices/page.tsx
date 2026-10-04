import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { PairingForm } from "@/components/devices/pairing-form";
import { Button } from "@/components/ui/button";
import { listDevices, MAX_ACTIVE_DEVICES } from "@/lib/device/pairing";
import { revokeDeviceAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function ago(iso: string | null) {
  if (!iso) return "chưa có kết nối";
  const sec = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (sec < 60) return "vừa xong";
  if (sec < 3600) return `${Math.round(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.round(sec / 3600)} giờ trước`;
  return `${Math.round(sec / 86400)} ngày trước`;
}

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fdevices");
  const devices = await listDevices(session.user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Thiết bị</p>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Đồng hồ của bạn</h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">Ghép nối đồng hồ Wear OS để gửi tín hiệu đo và nhận cảnh báo tự động.</p>
        </section>

        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-[1fr_460px]">
            <div className="space-y-5">
              {devices.length ? (
                devices.map((d) => {
                  const online = d.online;
                  return (
                    <div key={d.id} className="space-y-5 rounded-[20px] bg-canvas-white p-8 md:p-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">{d.name}</h2>
                          <p className="text-sm text-slate">{[d.model, d.platform].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className={`flex items-center gap-2 rounded-[20px] px-3 py-1 text-sm ${online ? "bg-ivory" : "bg-fog"}`}>
                          <span className={`size-2 rounded-full ${online ? "bg-ember-orange" : "bg-slate"}`} />
                          {online ? "Đang kết nối" : "Ngoại tuyến"}
                        </span>
                      </div>
                      <dl className="grid grid-cols-3 gap-5">
                        <div><dt className="text-sm text-slate">Pin</dt><dd className="font-heading text-lg">{d.battery_pct != null ? `${d.battery_pct}%` : "—"}</dd></div>
                        <div><dt className="text-sm text-slate">Lần cuối online</dt><dd className="font-heading text-lg">{ago(d.last_seen_at)}</dd></div>
                        <div><dt className="text-sm text-slate">Ghép nối</dt><dd className="font-heading text-lg">{dateFmt.format(new Date(d.paired_at))}</dd></div>
                      </dl>
                      <form action={revokeDeviceAction}>
                        <input type="hidden" name="deviceId" value={d.id} />
                        <Button type="submit" variant="outline">Gỡ thiết bị</Button>
                      </form>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-[20px] bg-canvas-white p-8 text-steel md:p-10">Chưa có đồng hồ nào. Tạo mã bên cạnh rồi nhập vào ứng dụng UII trên đồng hồ.</p>
              )}
            </div>

            <div className="space-y-4 self-start rounded-[6px_0_0_0] bg-canvas-white p-8 md:pt-[70px] md:pr-10 md:pb-10 md:pl-[60px]">
              <h2 className="font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">Ghép nối thiết bị mới</h2>
              <p className="text-sm text-steel">Mở ứng dụng UII trên đồng hồ và nhập mã này. Tối đa {MAX_ACTIVE_DEVICES} thiết bị.</p>
              <div className="pt-4"><PairingForm /></div>
              <ol className="space-y-2 pt-6 text-sm text-steel">
                <li>1. Cài ứng dụng UII trên đồng hồ Wear OS.</li>
                <li>2. Chọn &ldquo;Ghép nối&rdquo; và nhập mã 8 số.</li>
                <li>3. Đợi thiết bị hiện trong danh sách.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
