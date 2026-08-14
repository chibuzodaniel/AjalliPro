import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">CI</div>
          <div>
            <h1>Cusica International</h1>
            <p>Ajalli Table Water — Operations ERP</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
