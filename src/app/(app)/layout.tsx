import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--acolhe-bg)" }}>
      <Sidebar />
      <main className="lg:pl-60">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
