import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HeartRateChart } from "@/components/dashboard/heart-rate-chart";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "Cảnh báo sớm",
    body: "Đồng hồ theo dõi nhịp tim và chuyển động, báo ngay khi có dấu hiệu tiền động kinh, té ngã hoặc cơn co giật.",
  },
  {
    title: "Hồ sơ SOS",
    body: "Nhóm máu, thuốc đang dùng, dị ứng và người liên hệ nằm sẵn trên một thẻ để đội cấp cứu đọc trong vài giây.",
  },
  {
    title: "Circle người thân",
    body: "Mời người thân bằng email. Họ nhận cảnh báo sớm nhất, và chỉ thấy dữ liệu bạn cho phép.",
  },
];

const steps = [
  { n: "01", title: "Đăng nhập", body: "Dùng tài khoản Google, không cần nhớ thêm mật khẩu." },
  { n: "02", title: "Hoàn thiện hồ sơ SOS", body: "Điền các thông tin quan trọng một lần, dùng khi cần." },
  { n: "03", title: "Mời người thân", body: "Chọn ai được nhận cảnh báo và được xem lịch sử đến đâu." },
];

const sample = [74, 72, 75, 73, 78, 84, 81, 79, 92, 104, 96, 86, 80, 77, 75, 74, 76, 73];

const h2 = "font-heading text-[32px] leading-[1.19] tracking-[-0.02em] md:text-[40px] md:leading-[1.2]";
const container = "mx-auto w-full max-w-[1200px] px-5";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className={`${container} flex flex-wrap items-center justify-between gap-4 py-6`}>
        <Link href="/" className="font-heading text-2xl tracking-[-0.02em]">
          UII
        </Link>
        <nav aria-label="Chính" className="order-3 w-full md:order-none md:w-auto">
          <ul className="flex w-max gap-5 rounded-full bg-ash px-[18px] py-2">
            <li>
              <a href="#tinh-nang" className="font-heading tracking-[-0.02em] hover:text-steel">
                Tính năng
              </a>
            </li>
            <li>
              <a href="#cach-hoat-dong" className="font-heading tracking-[-0.02em] hover:text-steel">
                Cách hoạt động
              </a>
            </li>
          </ul>
        </nav>
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Đăng nhập
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className={`${container} grid items-center gap-[60px] pt-10 pb-[80px] lg:grid-cols-2`}>
          <div>
            <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Giám sát động kinh dành cho gia đình</p>
            <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
              Biết sớm. Phản ứng kịp.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-[1.25] text-steel">
              UII theo dõi dấu hiệu tiền động kinh, té ngã và cơn co giật, rồi báo ngay cho người thân cùng thông tin cần
              thiết để cấp cứu.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Vào dịch vụ
              </Link>
              <a href="#cach-hoat-dong" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Xem cách hoạt động
              </a>
            </div>
          </div>

          <div className="rounded-[20px] bg-ash p-8 md:p-10" aria-hidden>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-heading text-lg tracking-[-0.02em]">Tiền động kinh</p>
              <p className="text-[13px] text-slate">Minh họa</p>
            </div>
            <p className="mt-2 font-heading text-[40px] leading-[1.2] tracking-[-0.02em]">
              <span className="underline decoration-ember-orange decoration-1 underline-offset-[6px]">104 bpm</span>
            </p>
            <div className="mt-5 rounded-[8px] bg-canvas-white p-5">
              <HeartRateChart values={sample} threshold={100} />
            </div>
            <p className="mt-5 text-sm text-steel">Người thân nhận thông báo trong vài giây.</p>
          </div>
        </section>

        {/* Features */}
        <section id="tinh-nang" className="scroll-mt-5 bg-ash py-[80px]">
          <div className={container}>
            <h2 className={h2}>Mọi thứ cần có khi giây phút quan trọng</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-[6px_0_0_0] bg-canvas-white p-8 md:p-10">
                  <h3 className="font-heading text-lg tracking-[-0.02em]">{f.title}</h3>
                  <p className="mt-3 text-steel">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="cach-hoat-dong" className={`${container} scroll-mt-5 py-[80px]`}>
          <h2 className={h2}>Bắt đầu trong ba bước</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="border-t border-graphite pt-5">
                <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">{s.n}</p>
                <h3 className="mt-3 font-heading text-lg tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2 text-steel">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="bg-ivory py-[80px]">
          <div className={`${container} flex flex-col gap-8 md:flex-row md:items-center md:justify-between`}>
            <h2 className={`${h2} max-w-xl`}>Sẵn sàng để người thân yên tâm hơn?</h2>
            <Link href="/login" className={`${buttonVariants({ size: "lg" })} w-fit`}>
              Đăng nhập với Google
            </Link>
          </div>
        </section>
      </main>

      <footer className={`${container} py-10 text-[13px] text-slate`}>
        <p className="font-heading tracking-[-0.02em]">UII · Giám sát động kinh</p>
        <p className="mt-2 max-w-2xl">
          UII hỗ trợ theo dõi và cảnh báo, không thay thế thiết bị y tế hay chẩn đoán của bác sĩ. Trong tình huống khẩn
          cấp, hãy gọi 115.
        </p>
      </footer>
    </div>
  );
}
