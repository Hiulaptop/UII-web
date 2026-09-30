import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const [{ error, callbackUrl }, session] = await Promise.all([searchParams, auth()]);
  // Sessions created before the users table existed lack an id; make them sign in again.
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center px-5 py-6">
        <span className="font-heading text-2xl tracking-[-0.02em]">UII</span>
      </header>

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-[60px] px-5 pb-[80px] lg:grid-cols-2">
        <section className="space-y-5">
          <h1 className="font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
            Bình yên trong từng nhịp đập.
          </h1>
          <p className="max-w-md text-lg leading-[1.25] text-steel">
            Giám sát cảnh báo tiền động kinh, té ngã và cơn co giật, để người thân luôn biết sớm nhất.
          </p>
        </section>

        <section className="rounded-[6px_0_0_0] bg-ash p-8 md:pt-[70px] md:pr-10 md:pb-[60px] md:pl-[60px]">
          <h2 className="font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">
            Đăng nhập
          </h2>
          <p className="mt-3 text-[14px] leading-[1.43] text-steel">
            Dùng tài khoản Google để tiếp tục.
          </p>

          {error && (
            <p role="alert" className="mt-5 text-[14px] text-graphite underline decoration-ember-orange decoration-1 underline-offset-[3px]">
              Đăng nhập không thành công. Vui lòng thử lại.
            </p>
          )}

          <form
            className="mt-[36px]"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              Tiếp tục với Google
            </Button>
          </form>

          <p className="mt-5 text-[13px] text-slate">
            Chúng tôi chỉ dùng email và tên của bạn để tạo tài khoản.
          </p>
        </section>
      </main>
    </div>
  );
}
