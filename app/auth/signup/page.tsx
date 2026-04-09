import Link from "next/link"
import { signUpAction } from "@/lib/auth/actions"
import { Button } from "@/components/primitives/Button"
import { TextInput } from "@/components/primitives/TextInput"

interface SignupPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const sp = await searchParams
  const redirectTo = sp.redirect ?? "/"
  const errorMsg = sp.error

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Smart Betting. Simple Insights.</p>
        {errorMsg && <div className="auth-error" role="alert">{errorMsg}</div>}
        <form action={signUpAction} className="auth-form">
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
            label="Password (min 8 chars)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" block>Create account</Button>
        </form>
        <div className="auth-foot">
          Already a member? <Link href="/auth/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
