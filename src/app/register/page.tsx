import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  );
}
