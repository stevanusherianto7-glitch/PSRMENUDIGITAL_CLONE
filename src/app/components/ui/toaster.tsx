import { toast } from 'sonner';

export function showErrorToast(message: string, error?: Error) {
  toast.error(message, {
    description: error?.message,
    duration: 5000,
  });
}

export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

export function showLoadingToast(message: string, promise: Promise<any>) {
  return toast.promise(promise, {
    loading: message,
    success: (data) => `${message} berhasil`,
    error: (error) => `${message} gagal: ${error.message}`,
  });
}
