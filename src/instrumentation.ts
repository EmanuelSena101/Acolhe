export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_BOOTSTRAP === "1") return;

  const { runBootstrap } = await import("./server/bootstrap");
  try {
    await runBootstrap();
  } catch (err) {
    console.error("[bootstrap] failed:", err);
  }
}
