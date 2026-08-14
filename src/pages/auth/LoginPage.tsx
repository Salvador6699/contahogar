import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { appToast as toast } from "@/lib/swal";
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.removeItem('contahogar_active_team_id');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("¡Bienvenido de nuevo!");
        navigate('/select-team');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-fade-in-up">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            ContaHogar
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            Inicia sesión para acceder a tus finanzas
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none text-foreground"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none text-foreground"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-lg shadow-primary/25"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
            ) : (
              <>
                <span>Entrar</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
