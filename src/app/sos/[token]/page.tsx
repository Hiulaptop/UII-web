import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCardByToken } from "@/lib/sos/service";

// Public, secret-link page: never cached, never indexed, never leaks the link through the Referer header.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Thẻ SOS",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const linkCls = "underline decoration-ember-orange decoration-1 underline-offset-[3px]";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-[640px] flex-1 px-5 py-10">{children}</main>;
}

export default async function SosCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const r = await getCardByToken(token, ip, h.get("user-agent"));

  if (r.kind === "not_found") notFound();
  if (r.kind === "rate_limited") {
    return (
      <Shell>
        <h1 className="font-heading text-[32px] tracking-[-0.02em]">Quá nhiều lần thử</h1>
        <p className="mt-3 text-steel">Vui lòng chờ một phút rồi quét lại. Nếu đây là tình huống khẩn cấp, hãy gọi 115.</p>
        <a href="tel:115" className={`mt-6 inline-block text-lg ${linkCls}`}>
          Gọi 115
        </a>
      </Shell>
    );
  }

  const c = r.card;
  const facts = [
    c.age !== null && `${c.age} tuổi`,
    c.sex,
    c.height_cm && `${c.height_cm} cm`,
    c.weight_kg && `${c.weight_kg} kg`,
  ].filter(Boolean);

  return (
    <Shell>
      <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Thẻ SOS · Người có bệnh động kinh</p>
      <h1 className="mt-4 font-heading text-[40px] leading-[1.1] tracking-[-0.02em]">{c.name ?? "Không rõ tên"}</h1>
      {facts.length > 0 && <p className="mt-2 text-steel">{facts.join(" · ")}</p>}

      <a href="tel:115" className="mt-6 flex h-14 items-center justify-center rounded-full bg-graphite font-heading text-lg text-canvas-white">
        Gọi cấp cứu 115
      </a>

      <section className="mt-8 grid grid-cols-2 gap-5 border-y border-mist py-6">
        <div>
          <p className="text-sm text-slate">Nhóm máu</p>
          <p className="mt-1 font-heading text-[40px] leading-none tracking-[-0.02em]">{c.blood_type ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-slate">Dị ứng</p>
          <p className="mt-1 text-graphite">{c.allergies.length ? c.allergies.join(", ") : "Không ghi nhận"}</p>
        </div>
      </section>

      <section className="mt-6 space-y-5">
        <div>
          <h2 className="text-sm text-slate">Chẩn đoán</h2>
          <p className="mt-1">{c.epilepsy_type ?? "—"}</p>
          {c.conditions.length > 0 && <p className="mt-1 text-steel">Bệnh nền: {c.conditions.join(", ")}</p>}
        </div>
        {c.seizure_notes && (
          <div>
            <h2 className="text-sm text-slate">Ghi chú về cơn co giật</h2>
            <p className="mt-1 whitespace-pre-line">{c.seizure_notes}</p>
          </div>
        )}
        <div>
          <h2 className="text-sm text-slate">Thuốc đang dùng</h2>
          {c.meds.length ? (
            <ul className="mt-1 space-y-1">
              {c.meds.map((m, i) => (
                <li key={i}>{[m.name, m.dosage, m.schedule].filter(Boolean).join(" · ")}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">—</p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-[20px] bg-ash p-6">
        <h2 className="font-heading text-lg tracking-[-0.02em]">Liên hệ khẩn cấp</h2>
        {c.contacts.length ? (
          <ul className="mt-3 space-y-3">
            {c.contacts.map((x, i) => (
              <li key={i}>
                {x.name}
                {x.relation && <span className="text-steel"> ({x.relation})</span>} ·{" "}
                <a href={tel(x.phone)} className={linkCls}>
                  {x.phone}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-steel">Chưa có.</p>
        )}
        {(c.doctor_name || c.hospital) && (
          <p className="mt-4 text-sm text-steel">
            Bác sĩ: {c.doctor_name ?? "—"}
            {c.doctor_phone && (
              <>
                {" · "}
                <a href={tel(c.doctor_phone)} className={linkCls}>
                  {c.doctor_phone}
                </a>
              </>
            )}
            {c.hospital && <> · {c.hospital}</>}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg tracking-[-0.02em]">Nếu người này đang co giật</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-steel">
          <li>Giữ bình tĩnh, bấm giờ cơn co giật.</li>
          <li>Đặt vật mềm dưới đầu, dời vật nguy hiểm xung quanh. Không giữ chặt người bệnh.</li>
          <li>Không nhét bất cứ thứ gì vào miệng.</li>
          <li>Khi hết co giật, đặt nằm nghiêng một bên.</li>
          <li>Gọi 115 nếu cơn kéo dài quá 5 phút, co giật lặp lại, bị thương, khó thở hoặc không tỉnh lại.</li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-slate">Thông tin do chính người dùng nhập, có thể chưa được cập nhật.</p>
    </Shell>
  );
}
