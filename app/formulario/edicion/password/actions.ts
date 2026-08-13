"use server";

import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';

export async function updatePassword(
  userId: string,
  currentPass: string,
  newPass: string,
  role: string
) {
  try {
    // If the role is ESTUDIANTE, they might be in the Student table.
    // Assuming other roles are in the User table.
    const tableName = role.toUpperCase() === 'ESTUDIANTE' ? 'Student' : 'User';

    const { data: user, error } = await supabase
      .from(tableName)
      .select('password')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: 'Error al verificar el usuario.' };
    }

    if (!user) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (!user.password) {
      return { success: false, error: 'El usuario no tiene una contraseña establecida.' };
    }

    const passwordsMatch = await bcrypt.compare(currentPass, user.password);
    
    if (!passwordsMatch) {
      return { success: false, error: 'La contraseña actual es incorrecta.' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPass, salt);

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ password: hashedNewPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: 'No se pudo actualizar la contraseña.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Update password exception:', err);
    return { success: false, error: 'Ocurrió un error inesperado.' };
  }
}
