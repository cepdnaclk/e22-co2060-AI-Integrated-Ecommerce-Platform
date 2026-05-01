import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <div className="w-full space-y-4">
        <AuthForm mode="login" />
        <p className="text-center text-sm">
          No account?{" "}
          <Link href="/register" className="text-blue-600">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
