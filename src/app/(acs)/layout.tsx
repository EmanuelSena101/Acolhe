import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AcsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.papel !== "ACS") redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--acolhe-bg)" }}>
      <Sidebar />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
