"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggleTab = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        // Verificar si el alias ya existe en la base de datos
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('alias')
          .eq('alias', alias.trim())
          .maybeSingle();

        if (existingProfile) {
          throw new Error('El alias ya está registrado por otro miembro.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              alias: alias.trim() || email.split('@')[0],
              crew: 'DHW',
              role: 'Miembro',
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          setSuccessMsg('¡Registro exitoso! Iniciando sesión...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          setSuccessMsg(
            '¡Registro exitoso! Por favor, verifica tu correo electrónico para confirmar tu cuenta y poder ingresar.'
          );
        }
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar la solicitud.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--color-graffiti-red)] rounded-full mix-blend-screen filter blur-[100px] opacity-15"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--color-graffiti-chrome)] rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>
      
      {/* Logo / Header */}
      <div className="z-10 mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center border border-[var(--color-graffiti-red)] shadow-[0_0_20px_rgba(255,30,39,0.3)] mb-4">
          <MapPin size={32} className="text-[var(--color-graffiti-red)]" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
          DHW <span className="text-[var(--color-graffiti-red)]">CREW</span>
        </h1>
        <p className="text-gray-400 text-sm tracking-widest mt-2 uppercase font-mono">Archive System</p>
      </div>

      {/* Form Card */}
      <div className="z-10 w-full max-w-sm bg-zinc-950/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-graffiti-red)] via-[var(--color-graffiti-chrome)] to-[var(--color-graffiti-red)]"></div>

        <div className="flex mb-6 border-b border-white/5">
          <button 
            className={`flex-1 pb-3 text-sm font-extrabold transition-colors cursor-pointer ${isLogin ? 'text-[var(--color-graffiti-red)] border-b-2 border-[var(--color-graffiti-red)]' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => handleToggleTab(true)}
          >
            INGRESAR
          </button>
          <button 
            className={`flex-1 pb-3 text-sm font-extrabold transition-colors cursor-pointer ${!isLogin ? 'text-[var(--color-graffiti-chrome)] border-b-2 border-[var(--color-graffiti-chrome)]' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => handleToggleTab(false)}
          >
            REGISTRAR
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg font-mono">
              {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div className="bg-zinc-900 border border-[var(--color-graffiti-chrome)]/30 text-zinc-100 text-xs p-3 rounded-lg font-mono">
              {successMsg}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="text-xs text-gray-400 font-mono mb-1 block">ALIAS</label>
              <input 
                type="text" 
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Tu tag o chapa" 
                className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
              />
            </div>
          )}
          
          <div>
            <label className="text-xs text-gray-400 font-mono mb-1 block">CORREO</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@dhw.com" 
              className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-mono mb-1 block">CONTRASEÑA</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`mt-4 w-full py-3 rounded-lg font-extrabold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              isLogin 
                ? 'bg-[var(--color-graffiti-red)] text-white shadow-[0_0_15px_rgba(255,30,39,0.4)]' 
                : 'bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                {isLogin ? 'ENTRAR AL SISTEMA' : 'UNIRSE A LA CREW'}
              </>
            )}
          </button>
        </form>

        {isLogin && (
          <p className="mt-4 text-center text-xs text-gray-500 cursor-pointer hover:text-white transition-colors">
            ¿Olvidaste tu contraseña?
          </p>
        )}
      </div>
    </main>
  );
}
