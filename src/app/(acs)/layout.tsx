import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function AcsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.papel !== "ACS") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-blue-700">SaudeTermitorio</h1>
          <span className="text-sm text-gray-600">{session.user.nome}</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
    </div>
  );
}
