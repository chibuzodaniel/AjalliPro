"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerUser } from "@/app/register/actions";

const ROLE_OPTIONS = [
  { value: "SALES_STAFF", label: "Sales Staff" },
  { value: "EDITOR", label: "Editor" },
  { value: "ADMIN_STAFF", label: "Admin Staff" },
  { value: "ADMIN", label: "Admin" },
];

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALES_STAFF");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await registerUser({ name, email, password, role });
      if (!result.ok) {
        setError(result.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError("Account created, but sign-in failed. Try logging in.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Full name</label>
        <input
          type="text"
          placeholder="e.g. Ifeoma Okafor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Work email</label>
        <input
          type="email"
          placeholder="you@cusica.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <div className="field">
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {/* Signing up with the designated owner email always grants Super Admin, regardless of the role picked here. */}
      </div>
      {error && <div className="field-error">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account →"}
      </button>
      <div className="auth-switch">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </form>
  );
}
