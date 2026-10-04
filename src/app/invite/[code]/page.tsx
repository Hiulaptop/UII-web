import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { getInviteByCode, getInviteContext, isPending, normalizeEmail } from "@/lib/invites";
import { circleRoleLabel, historyLabel } from "@/lib/labels";
import { acceptInviteAction, declineInviteAction } from "../actions";

type Props = { params: Promise<{ code: string }> };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center px-5 py-6">
        <span className="font-heading text-2xl tracking-[-0.02em]">UII</span>
      </header>
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 items-center px-5 pb-[80px]">
        <section className="w-full max-w-xl rounded-[6px_0_0_0] bg-ash p-8 md:pt-[70px] md:pr-10 md:pb-[60px] md:pl-[60px]">
          {children}
        </section>
      </main>
    </div>
  );
}

const h1 = "font-heading text-[32px] leading-[1.19] tracking-[-0.02em]";

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const invite = await getInviteByCode(code);
  if (!invite || !isPending(invite)) {
    return (
      <Shell>
        <h1 className={h1}>Lời mời không còn hiệu lực</h1>
        <p className="mt-3 text-sm text-steel">Lời mời đã hết hạn, bị thu hồi hoặc đã được sử dụng. Hãy nhờ người thân gửi lại lời mời mới.</p>
        <Link href="/dashboard" className={`${buttonVariants({ variant: "outline" })} mt-[36px]`}>
          Về trang chính
        </Link>
      </Shell>
    );
  }

  if (normalizeEmail(session.user.email) !== invite.email) {
    return (
      <Shell>
        <h1 className={h1}>Lời mời dành cho email khác</h1>
        <p className="mt-3 text-sm text-steel">
          Bạn đang đăng nhập bằng {session.user.email}. Hãy đăng xuất và đăng nhập lại bằng đúng email đã được mời.
        </p>
        <form
          className="mt-[36px]"
          action={async () => {
            "use server";
            await signOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}` });
          }}
        >
          <Button type="submit">Đăng xuất</Button>
        </form>
      </Shell>
    );
  }

  const { subjectName } = await getInviteContext(invite);

  return (
    <Shell>
      <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Lời mời vào circle</p>
      <h1 className={`${h1} mt-3`}>{subjectName} mời bạn theo dõi</h1>
      <dl className="mt-[36px] space-y-3 text-sm">
        <div className="flex justify-between gap-5">
          <dt className="text-slate">Vai trò</dt>
          <dd>{circleRoleLabel[invite.role]}</dd>
        </div>
        <div className="flex justify-between gap-5">
          <dt className="text-slate">Lịch sử cảnh báo bạn sẽ thấy</dt>
          <dd>{historyLabel(invite.history_days)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-[13px] text-slate">
        Bạn sẽ nhận cảnh báo và xem hồ sơ SOS của {subjectName}. Họ có thể xóa bạn khỏi circle bất cứ lúc nào.
      </p>
      <div className="mt-[36px] flex gap-3">
        <form action={acceptInviteAction}>
          <input type="hidden" name="inviteId" value={invite.id} />
          <Button type="submit">Chấp nhận</Button>
        </form>
        <form action={declineInviteAction}>
          <input type="hidden" name="inviteId" value={invite.id} />
          <Button type="submit" variant="outline">
            Từ chối
          </Button>
        </form>
      </div>
    </Shell>
  );
}
