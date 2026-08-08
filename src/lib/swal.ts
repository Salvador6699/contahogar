import Swal from 'sweetalert2';

/**
 * Gets computed CSS custom property value from the document root.
 * Used to read app theme colors for SweetAlert2.
 */
const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/**
 * Resolves an hsl() CSS variable to a full color string.
 * Supabase stores them as "220 14.3% 95.9%" (raw HSL values without the hsl() wrapper).
 */
const resolveHsl = (varName: string): string => {
  const raw = getCSSVar(varName);
  if (!raw) return '';
  // If it already starts with '#' or 'rgb', return as-is
  if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
  // Otherwise treat it as HSL values
  return `hsl(${raw})`;
};

/**
 * Creates a SweetAlert2 instance pre-configured with the app's current theme.
 * Call this function every time to pick up the current theme (light/dark).
 */
const getThemeOptions = () => {
  const isDark = document.documentElement.classList.contains('dark');

  return {
    background: resolveHsl('--background') || (isDark ? '#1a1a2e' : '#ffffff'),
    color: resolveHsl('--foreground') || (isDark ? '#f8f8f8' : '#1a1a1a'),
    confirmButtonColor: resolveHsl('--primary') || '#6366f1',
    customClass: {
      popup: 'swal-app-popup',
      confirmButton: 'swal-app-confirm',
      cancelButton: 'swal-app-cancel',
      title: 'swal-app-title',
      htmlContainer: 'swal-app-text',
    },
  };
};

/** Success modal — requires user to click Aceptar */
export const swalSuccess = (title: string, text?: string) =>
  Swal.fire({
    ...getThemeOptions(),
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Aceptar',
    buttonsStyling: false,
  });

/** Error modal — requires user to click Aceptar */
export const swalError = (title: string, text?: string) =>
  Swal.fire({
    ...getThemeOptions(),
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Aceptar',
    buttonsStyling: false,
  });

/** Confirmation modal — returns true if the user clicks Confirmar */
export const swalConfirm = async (title: string, text?: string): Promise<boolean> => {
  const result = await Swal.fire({
    ...getThemeOptions(),
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
  });
  return result.isConfirmed;
};

/** Loading modal — call swalClose() or swalSuccess/Error to dismiss */
export const swalLoading = (title: string) => {
  Swal.fire({
    ...getThemeOptions(),
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
    buttonsStyling: false,
  });
};

export const swalClose = () => Swal.close();
