import AgentChat from "@/components/AgentChat";

export default function Page() {
  return (
    <main className="min-h-screen bg-canvas">
      <AgentChat />
      <footer className="pb-10 text-center text-xs text-muted">
        StableArc · local-currency settlement on Celo · no US dollar in the path
      </footer>
    </main>
  );
}
