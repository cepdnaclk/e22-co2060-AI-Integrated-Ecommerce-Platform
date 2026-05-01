import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <div className="w-full space-y-4">
        <AuthForm mode="register" />
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
