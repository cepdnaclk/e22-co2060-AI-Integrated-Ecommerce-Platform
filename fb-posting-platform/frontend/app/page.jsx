import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">Automatic Facebook Page Publisher</h1>
      <p className="max-w-2xl text-slate-600">
        Securely connect your Facebook pages, schedule posts, and automatically publish with status tracking.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-blue-600 px-4 py-2 text-white">
          Login
        </Link>
        <Link href="/register" className="rounded border border-slate-300 px-4 py-2">
          Register
        </Link>
      </div>
    </main>
  );
}
