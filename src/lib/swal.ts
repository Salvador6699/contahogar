import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

export const MySwal = withReactContent(Swal);

export const Toast = MySwal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: 'swal-app-popup',
    title: 'swal-app-title text-sm',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

export const appToast = {
  success: (title: string, text?: string) => Toast.fire({ icon: 'success', title, text }),
  error: (title: string, text?: string) => Toast.fire({ icon: 'error', title, text }),
  info: (title: string, text?: string) => Toast.fire({ icon: 'info', title, text }),
  warning: (title: string, text?: string) => Toast.fire({ icon: 'warning', title, text }),
  message: (title: string) => Toast.fire({ title })
};

export const AppAlert = MySwal.mixin({
  customClass: {
    popup: 'swal-app-popup',
    title: 'swal-app-title',
    htmlContainer: 'swal-app-text',
    confirmButton: 'swal-app-confirm',
    cancelButton: 'swal-app-cancel',
  },
  buttonsStyling: false,
  confirmButtonText: 'Aceptar',
  cancelButtonText: 'Cancelar',
});

// Legacy exports for ContaHogar
export const swalSuccess = (title: string, text?: string) => AppAlert.fire({ icon: 'success', title, text });
export const swalError = (title: string, text?: string) => AppAlert.fire({ icon: 'error', title, text });
export const swalConfirm = async (title: string, text?: string, confirmText = 'Sí, continuar') => {
  const result = await AppAlert.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
  });
  return result.isConfirmed;
};
export const swalLoading = (title: string) => AppAlert.fire({ title, allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
export const swalClose = () => Swal.close();

