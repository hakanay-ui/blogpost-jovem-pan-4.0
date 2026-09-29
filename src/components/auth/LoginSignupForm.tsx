import { useEffect, useState, type FormEvent } from "react";
import { User, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export default function LoginSignupForm() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/admin" });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) setError(error.message);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    const { error, requiresApproval } = await signUp(
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.password,
    );
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (requiresApproval) {
      setInfo(
        "Conta criada com sucesso! Sua conta está aguardando aprovação de um administrador.",
      );
    } else {
      setInfo("Conta criada! Faça login para continuar.");
      setIsActive(false);
    }
  };

  return (
    <div className="lsf-root">
      <style>{styles}</style>
      <div className={`lsf-container${isActive ? " active" : ""}`}>
        {/* Login Form */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <h1>Entrar</h1>
            <div className="input-box">
              <input
                type="email"
                placeholder="E-mail"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <Mail className="input-icon" size={18} />
            </div>
            <div className="input-box">
              <input
                type="password"
                placeholder="Senha"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <Lock className="input-icon" size={18} />
            </div>
            <div className="forgot-link">
              <a href="#" onClick={(e) => e.preventDefault()}>
                Esqueceu a senha?
              </a>
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : "Entrar"}
            </button>
            {error && !isActive && <p className="msg msg-error">{error}</p>}
            {info && !isActive && <p className="msg msg-info">{info}</p>}
          </form>
        </div>

        {/* Register Form */}
        <div className="form-box register">
          <form onSubmit={handleRegister}>
            <h1>Criar conta</h1>
            <div className="input-box">
              <input
                type="text"
                placeholder="Nome completo"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
              <User className="input-icon" size={18} />
            </div>
            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                required
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
              <Mail className="input-icon" size={18} />
            </div>
            <div className="input-box">
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              <Lock className="input-icon" size={18} />
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : "Cadastrar"}
            </button>
            {error && isActive && <p className="msg msg-error">{error}</p>}
            {info && isActive && <p className="msg msg-info">{info}</p>}
          </form>
        </div>

        {/* Toggle Box */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1>Bem-vindo</h1>
            <p>Ainda não tem uma conta?</p>
            <button type="button" className="btn" onClick={() => setIsActive(true)}>
              Cadastrar
            </button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>Você já tem login?</h1>
            <p>Entre na sua conta</p>
            <button type="button" className="btn" onClick={() => setIsActive(false)}>
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
  .lsf-root {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    background: #FFFFFF;
    padding: 20px;
  }
  .lsf-container, .lsf-container * {
    box-sizing: border-box;
    font-family: 'Geist', 'Inter', system-ui, sans-serif;
  }
  .lsf-container {
    position: relative;
    width: 850px;
    max-width: 100%;
    height: 600px;
    background: #fff;
    border-radius: 30px;
    box-shadow: 0 20px 60px rgba(10, 31, 59, 0.16);
    overflow: hidden;
  }
  .lsf-container h1 {
    font-size: 32px;
    font-weight: 800;
    margin: -10px 0;
    letter-spacing: -0.02em;
  }
  .lsf-container p { font-size: 14.5px; margin: 15px 0; }

  .form-box {
    position: absolute;
    right: 0;
    width: 50%;
    height: 100%;
    background: #fff;
    display: flex;
    align-items: center;
    color: hsl(213 96% 9%);
    text-align: center;
    padding: 40px;
    z-index: 1;
    transition: 0.6s ease-in-out 1.2s, visibility 0s 1s;
  }
  .form-box form { width: 100%; }
  .lsf-container.active .form-box { right: 50%; }
  .form-box.register { visibility: hidden; }
  .lsf-container.active .form-box.register { visibility: visible; }

  .input-box { position: relative; margin: 20px 0; }
  .input-box input {
    width: 100%;
    padding: 13px 50px 13px 20px;
    background: #f1f3f7;
    border-radius: 10px;
    border: 1px solid transparent;
    outline: none;
    font-size: 15px;
    color: hsl(213 96% 9%);
    font-weight: 500;
    transition: border-color 0.2s, background 0.2s;
  }
  .input-box input:focus {
    border-color: #0A1F3B;
    background: #fff;
  }
  .input-box input::placeholder { color: #888; font-weight: 400; }
  .input-box .input-icon {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    pointer-events: none;
  }

  .forgot-link { margin: -10px 0 15px; text-align: right; }
  .forgot-link a {
    font-size: 13.5px;
    color: hsl(213 40% 30%);
    text-decoration: none;
  }
  .forgot-link a:hover { color: #0A1F3B; }

  .btn {
    width: 100%;
    height: 48px;
    background: #0A1F3B;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(10, 31, 59, 0.3);
    border: none;
    cursor: pointer;
    font-size: 15px;
    color: #fff;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: filter 0.2s, transform 0.1s;
  }
  /* Sobre navy escuro, brightness(1.08) é imperceptível — usa o #1E3A5F da marca. */
  .btn:hover:not(:disabled) { background: #1E3A5F; }
  .btn:active:not(:disabled) { transform: scale(0.98); }
  .btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .msg {
    margin-top: 14px;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 8px;
    text-align: left;
  }
  .msg-error { background: rgba(239, 68, 68, 0.1); color: rgb(185, 28, 28); }
  .msg-info { background: rgba(16, 185, 129, 0.1); color: rgb(4, 120, 87); }

  .spin { animation: lsf-spin 0.8s linear infinite; }
  @keyframes lsf-spin { to { transform: rotate(360deg); } }

  .toggle-box { position: absolute; width: 100%; height: 100%; }
  .toggle-box::before {
    content: '';
    position: absolute;
    left: -250%;
    width: 300%;
    height: 100%;
    background: linear-gradient(135deg, #0A1F3B, #1E3A5F);
    border-radius: 150px;
    z-index: 2;
    transition: 1.8s ease-in-out;
  }
  .lsf-container.active .toggle-box::before { left: 50%; }

  .toggle-panel {
    position: absolute;
    width: 50%;
    height: 100%;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px;
    text-align: center;
    z-index: 2;
    transition: 0.6s ease-in-out;
  }
  .toggle-panel.toggle-left { left: 0; transition-delay: 1.2s; }
  .lsf-container.active .toggle-panel.toggle-left { left: -50%; transition-delay: 0.6s; }
  .toggle-panel.toggle-right { right: -50%; transition-delay: 0.6s; }
  .lsf-container.active .toggle-panel.toggle-right { right: 0; transition-delay: 1.2s; }
  .toggle-panel p { margin-bottom: 20px; opacity: 0.92; }
  .toggle-panel .btn {
    width: 160px;
    height: 46px;
    background: transparent;
    border: 2px solid #fff;
    box-shadow: none;
  }
  .toggle-panel .btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    filter: none;
  }

  @media screen and (max-width: 650px) {
    .lsf-container { height: calc(100vh - 40px); width: 100%; border-radius: 20px; }
    .form-box { bottom: 0; width: 100%; height: 70%; padding: 30px; }
    .lsf-container.active .form-box { right: 0; bottom: 30%; }
    .toggle-box::before {
      left: 0;
      top: -270%;
      width: 100%;
      height: 300%;
      border-radius: 20vw;
    }
    .lsf-container.active .toggle-box::before { left: 0; top: 70%; }
    .lsf-container.active .toggle-panel.toggle-left { left: 0; top: -30%; }
    .toggle-panel { width: 100%; height: 30%; padding: 20px; }
    .toggle-panel.toggle-left { top: 0; }
    .toggle-panel.toggle-right { right: 0; bottom: -30%; }
    .lsf-container.active .toggle-panel.toggle-right { bottom: 0; }
    .lsf-container h1 { font-size: 26px; }
  }
  @media screen and (max-width: 400px) {
    .form-box { padding: 20px; }
    .toggle-panel h1 { font-size: 24px; }
  }
`;
