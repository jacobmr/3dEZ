export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="mb-6 text-5xl font-bold tracking-tight">3dEZ</h1>
      <p className="mb-8 max-w-md text-center text-lg text-zinc-400">
        Design custom 3D-printable objects through guided conversation.
      </p>
      <button
        type="button"
        className="rounded-full bg-white px-8 py-3 text-lg font-medium text-black transition-colors hover:bg-zinc-200"
      >
        Start Designing
      </button>
    </div>
  );
}
