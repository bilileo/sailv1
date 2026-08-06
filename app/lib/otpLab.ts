import { generate } from 'otplib';

/**
 * Obtiene el código OTP actual para un laboratorio específico.
 * Se contacta con la ruta /api/labSecrets para recuperar el secreto
 * y la letra correspondiente al laboratorio (a-e), luego genera el OTP.
 *
 * @param labId El ID del laboratorio para el que se generará el código.
 * @returns Una promesa que resuelve en una cadena de 7 caracteres (1 letra + 6 dígitos).
 */
export async function getCodeForLaboratory(labId: number | string): Promise<string> {
  try {
    // 1. Obtener el secreto y la letra a través de la API
    // Se utiliza una ruta absoluta o relativa dependiendo del entorno,
    // asumiendo que esta función se llama desde el cliente (navegador).
    const response = await fetch(`/api/labSecrets?labId=${labId}`);

    if (!response.ok) {
      throw new Error(`Error al obtener los secretos para el laboratorio ${labId}`);
    }

    const data = await response.json();

    const { secreto, letter } = data;

    if (!secreto || !letter) {
      throw new Error('La respuesta de la API no contiene el secreto o la letra.');
    }

    // 2. Generar el OTP de 6 dígitos usando otplib
    const otp = await generate({ secret: secreto });

    // 3. Retornar el código combinado: letra (minúscula) seguida del OTP
    return `${letter.toUpperCase()}${otp}`;
  } catch (error) {
    console.error('Error en getCodeForLaboratory:', error);
    // Podríamos lanzar el error o retornar una cadena vacía en caso de fallo.
    // Lanzamos el error para que quien lo llama pueda manejarlo.
    throw error;
  }
}
