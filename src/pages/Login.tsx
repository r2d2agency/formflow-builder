import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
import logoFormBuilder from '@/assets/logo-formbuilder.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    const success = await login(email, password);
    
    if (success) {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate(from, { replace: true });
    } else {
      toast({
        title: 'Erro de autenticação',
        description: 'Email ou senha incorretos.',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Decorative gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-emerald-400 animate-gradient-shift" />
        
        {/* Floating shapes decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-10 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl animate-pulse delay-700" />
          <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-emerald-300/20 rounded-full blur-2xl animate-pulse delay-1000" />
          <div className="absolute top-20 right-1/3 w-32 h-32 bg-purple-300/30 rounded-full blur-xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <img 
            src={logoFormBuilder} 
            alt="FormBuilder Logo" 
            className="w-48 h-48 object-contain mb-8 drop-shadow-2xl"
          />
          <h1 className="text-4xl font-bold mb-4 text-center drop-shadow-lg">
            FormBuilder
          </h1>
          <p className="text-xl text-white/90 text-center max-w-md">
            Crie formulários incríveis e capture leads de forma inteligente
          </p>
          
          {/* Feature highlights */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-2 h-2 bg-emerald-300 rounded-full" />
              <span>Formulários estilo Typeform</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-2 h-2 bg-yellow-300 rounded-full" />
              <span>Integração com WhatsApp</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-2 h-2 bg-blue-300 rounded-full" />
              <span>Rastreamento de conversões</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img 
              src={logoFormBuilder} 
              alt="FormBuilder Logo" 
              className="w-24 h-24 object-contain mb-4"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent">
              FormBuilder
            </h1>
          </div>

          {/* Login card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bem-vindo de volta!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Entre para acessar o painel administrativo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 hover:from-purple-700 hover:via-blue-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            © {new Date().getFullYear()} FormBuilder. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
