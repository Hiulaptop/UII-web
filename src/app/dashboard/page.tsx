import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Xin chào, {session?.user?.name}</h1>
      <p className="text-muted-foreground">{session?.user?.email}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Đăng xuất
        </Button>
      </form>
    </main>
  );
}
