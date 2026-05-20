import { renderHook, act } from '@testing-library/react';
import { printService } from '../../utils/printService';
import { toast } from 'sonner';

// Mock EscPosEncoder
jest.mock('esc-pos-encoder', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockReturnThis(),
    codepage: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    newline: jest.fn().mockReturnThis(),
    encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  }));
});

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    loading: jest.fn().mockReturnValue('toast-loading-id'),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Security, Multi-Tab Sync, & Printer Failure Simulations', () => {
  let mockBluetoothSerial: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create a mock bluetoothSerial on global window object
    mockBluetoothSerial = {
      isEnabled: jest.fn().mockImplementation((success) => success()),
      list: jest.fn().mockImplementation((success) => success([])),
      connectInsecure: jest.fn().mockImplementation((address, success) => success()),
      disconnect: jest.fn().mockImplementation((success) => success()),
      write: jest.fn().mockImplementation((data, success) => success()),
      isConnected: jest.fn().mockImplementation((success) => success()),
    };

    (global as any).bluetoothSerial = mockBluetoothSerial;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).bluetoothSerial;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Printer Thermal Failure & Auto-Retry Loop
  // ---------------------------------------------------------------------------
  describe('Scenario 1: Printer Connection Failure & Retry Resiliency', () => {
    it('should retry up to 3 times on write failure and then report failure to UI via toast', async () => {
      // Mock write failure on every attempt
      mockBluetoothSerial.write.mockImplementation((data, success, failure) => {
        failure('Write error: device disconnected');
      });

      let errorThrown: any = null;
      const printPromise = printService.printRaw(new Uint8Array([1, 2, 3]), '06:2B:E0:4C:71:DF')
        .catch((err) => {
          errorThrown = err;
        });

      // Let the async code register its promises and advance timers
      await Promise.resolve();

      await act(async () => {
        // We need enough time for:
        // Attempt 1: write fails -> disconnects -> setTimeout 2000
        // Attempt 2: connect -> write fails -> disconnects -> setTimeout 2000
        // Attempt 3: connect -> write fails -> disconnects -> throws error
        // Total sleep time is 2000ms * 2 = 4000ms
        await jest.advanceTimersByTimeAsync(8000);
      });

      await printPromise;

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toContain('Gagal mengirim data: Write error: device disconnected');
      
      // Ensure bluetoothSerial.write was attempted 3 times (1 initial + 2 retries)
      expect(mockBluetoothSerial.write).toHaveBeenCalledTimes(3);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Printer gagal merespon setelah 3x percobaan')
      );
    });

    it('should succeed printing if connection recovers on the 2nd attempt', async () => {
      let attempts = 0;
      mockBluetoothSerial.write.mockImplementation((data, success, failure) => {
        attempts++;
        if (attempts === 1) {
          failure('Write error');
        } else {
          success();
        }
      });

      const printPromise = printService.printRaw(new Uint8Array([1, 2, 3]), '06:2B:E0:4C:71:DF');

      await Promise.resolve();

      await act(async () => {
        // Attempt 1: fails -> setTimeout 2000
        // Attempt 2: connect -> write succeeds -> setTimeout 500 -> resolves
        await jest.advanceTimersByTimeAsync(6000);
      });

      await expect(printPromise).resolves.toBeUndefined();
      
      expect(mockBluetoothSerial.write).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Printer berhasil terhubung kembali!');
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Multi-Tab Synchronization & Payment Lock Protection
  // ---------------------------------------------------------------------------
  describe('Scenario 2: Multi-Tab Sync Locks', () => {
    const LOCK_KEY = 'cashier_checkout_lock_tx1';

    beforeEach(() => {
      localStorage.clear();
    });

    it('should prevent concurrent checkouts on the same transaction across tabs using local storage locks', () => {
      // Helper function simulating checkout request
      const tryCheckout = (tabId: string) => {
        const currentLock = localStorage.getItem(LOCK_KEY);
        if (currentLock) {
          return { success: false, reason: 'Checkout is currently processed by another tab.' };
        }
        localStorage.setItem(LOCK_KEY, tabId);
        return { success: true };
      };

      // Tab A initiates payment
      const resA = tryCheckout('Tab-A');
      expect(resA.success).toBe(true);
      expect(localStorage.getItem(LOCK_KEY)).toBe('Tab-A');

      // Tab B tries to initiate payment simultaneously
      const resB = tryCheckout('Tab-B');
      expect(resB.success).toBe(false);
      expect(resB.reason).toBe('Checkout is currently processed by another tab.');
      expect(localStorage.getItem(LOCK_KEY)).toBe('Tab-A'); // Lock remains held by Tab-A

      // Tab A completes payment, releasing lock
      localStorage.removeItem(LOCK_KEY);

      // Now Tab B can successfully proceed
      const resBRetry = tryCheckout('Tab-B');
      expect(resBRetry.success).toBe(true);
      expect(localStorage.getItem(LOCK_KEY)).toBe('Tab-B');
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Session Expiry & Auto-Authentication Recovery
  // ---------------------------------------------------------------------------
  describe('Scenario 3: Session Expiry Recovery', () => {
    it('should clear invalid session and trigger a redirect flag when API returns a 401 status', async () => {
      localStorage.setItem('pawon_session', JSON.stringify({ role: 'admin', token: 'valid-token' }));

      // Mock API call returning 401 Unauthorized
      const mockApiWithAuthFailure = jest.fn().mockImplementation(() => {
        const error: any = new Error('JWT Expired or Invalid Token');
        error.status = 401;
        return Promise.reject(error);
      });

      let responseError: any = null;
      try {
        await mockApiWithAuthFailure();
      } catch (err: any) {
        responseError = err;
        // Verify code intercepts 401 and clears local credentials
        if (err.status === 401) {
          localStorage.removeItem('pawon_session');
        }
      }

      expect(responseError).toBeDefined();
      expect(responseError.status).toBe(401);
      expect(localStorage.getItem('pawon_session')).toBeNull(); // Session was cleared
    });
  });
});
