import Header from "./Header";

interface AppShellProps {
  conversationPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

export default function AppShell({
  conversationPanel,
  previewPanel,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      {/* Mobile: stacked single column. Desktop (>=1024px): two-column side-by-side */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex-1 overflow-y-auto lg:w-2/5 lg:flex-none">
          {conversationPanel}
        </div>
        <div className="flex-1 overflow-y-auto lg:w-3/5 lg:flex-none">
          {previewPanel}
        </div>
      </div>
    </div>
  );
}
