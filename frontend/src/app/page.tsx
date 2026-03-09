import AppShell from "@/components/layout/AppShell";

export default function Home() {
  return (
    <AppShell
      conversationPanel={
        <div className="flex h-full items-center justify-center p-6 text-zinc-400">
          Chat will go here
        </div>
      }
      previewPanel={
        <div className="flex h-full items-center justify-center border-t border-zinc-800 p-6 text-zinc-400 lg:border-l lg:border-t-0">
          3D Preview will go here
        </div>
      }
    />
  );
}
