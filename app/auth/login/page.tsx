import Link from "next/link"
import { signInAction } from "@/lib/auth/actions"
import { Button } from "@/components/primitives/Button"
import { TextInput } from "@/components/primitives/TextInput"

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams
  const redirectTo = sp.redirect ?? "/"
  const errorMsg = sp.error

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your AreBet account</p>
        {errorMsg && <div className="auth-error" role="alert">{errorMsg}</div>}
        <form action={signInAction} className="auth-form">
          <input type="hidden" name="redirect" value={redirectTo} />
          <TextInput
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            label="Email"
            required
            autoComplete="email"
          />
          <TextInput
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            label="Password"
            required
            autoComplete="current-password"
          />
          <Button type="submit" variant="primary" block>Sign in</Button>
        </form>
        <div className="auth-foot">
          New here? <Link href="/auth/signup">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
