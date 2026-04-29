import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function AcsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.papel !== "ACS") redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--acolhe-bg)" }}>
      <div
        className="mx-auto"
        style={{
          maxWidth: 430,
          minHeight: "100vh",
          backgroundColor: "var(--acolhe-bg)",
          borderLeft: "1px solid var(--acolhe-border)",
          borderRight: "1px solid var(--acolhe-border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
