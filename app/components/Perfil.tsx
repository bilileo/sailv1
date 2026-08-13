import React, { useState } from 'react';
import { X, Mail, Shield, User as UserIcon, Key } from 'lucide-react';
import { FormularioPassword } from '../formulario/edicion/password/FormularioPassword';

interface PerfilProps {
  usuario: { id: string; name: string; lastName?: string; role: string; email?: string | null };
  onClose: () => void;
}

export function Perfil({ usuario, onClose }: PerfilProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f9fa] animate-in fade-in duration-200">
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Perfil de Usuario</h1>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-[#1a73e8]"></div>

            <div className="px-6 md:px-8 pb-8">
              <div className="relative flex justify-between items-end -mt-12 mb-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-md">
                  <UserIcon className="w-12 h-12 text-gray-400" />
                </div>

                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded text-sm font-medium flex items-center transition-colors shadow-sm"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Cambiar Contraseña
                </button>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">
                {usuario.name} {usuario.lastName || ''}
              </h2>
              <p className="text-sm text-gray-500 mb-6">Gestión de cuenta y seguridad</p>

              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <Shield className="w-5 h-5 text-blue-600 mr-4" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Rol</p>
                    <p className="text-gray-900 font-medium">{usuario.role}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <Mail className="w-5 h-5 text-blue-600 mr-4" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Correo / Identificador</p>
                    <p className="text-gray-900 font-medium">{usuario.email || usuario.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPasswordForm && (
        <FormularioPassword
          usuario={usuario}
          onClose={() => setShowPasswordForm(false)}
        />
      )}
    </div>
  );
}
