"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false, // Evitamos que Next.js recargue la página automáticamente
    });

    if (res?.error) {
      setError('Credenciales incorrectas');
      setLoading(false);
    } else {
      router.push('/'); // Si es exitoso, lo mandamos al Dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-md shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-[#0b6e3f] mb-2">SAIL</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Sistema de Administración e Inventario de Laboratorios</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-sm mb-4 text-sm font-bold flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#0b6e3f]" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 border-gray-300 rounded-sm px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#0b6e3f]" required />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-[#0b6e3f] text-white py-3 rounded-sm font-bold hover:bg-green-800 transition-colors disabled:opacity-50">
            {loading ? 'Iniciando sesión...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}