import { renderHook, act } from '@testing-library/react';
import { useApi } from '../../app/hooks/useApi';
import { useTTS } from '../../app/hooks/useTTS';
import type { Order } from '../../app/types';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn().mockReturnValue(false),
  },
}));

// Mock TextToSpeech plugin
jest.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock printService
jest.mock('../../utils/printService', () => ({
  printService: {
    getIsConnected: jest.fn().mockReturnValue(false),
    printKitchen: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

describe('Robustness and Extreme Conditions Simulations', () => {
  let speakSpy: jest.SpyInstance;
  let cancelSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock window.speechSynthesis
    speakSpy = jest.fn().mockImplementation((utterance) => {
      // Simulate speech engine completing speech after 50ms
      setTimeout(() => {
        if (utterance.onend) {
          utterance.onend();
        }
      }, 50);
    });
    
    cancelSpy = jest.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: speakSpy,
        cancel: cancelSpy,
        getVoices: jest.fn().mockReturnValue([]),
      },
      writable: true,
      configurable: true,
    });

    global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
      text,
      lang: '',
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: null,
      onend: null,
      onerror: null,
    })) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Offline/Online Transitions (Flaky Network API Caching & Retries)
  // ---------------------------------------------------------------------------
  describe('Scenario 1: Offline/Online Transitions & API Retries', () => {
    it('should retry failed calls due to offline/flaky network and succeed when network restores', async () => {
      let attempts = 0;
      const mockApiFunc = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          // First 2 attempts fail due to simulated offline/network issue
          return Promise.reject(new Error('Network connection failed'));
        }
        // 3rd attempt succeeds when network restores
        return Promise.resolve({ success: true });
      });

      // Render the useApi hook with retry settings
      const { result } = renderHook(() =>
        useApi(mockApiFunc, { retryCount: 3, retryDelay: 100 })
      );

      // Execute API call in act block
      let executePromise;
      act(() => {
        executePromise = result.current.execute();
      });

      // Fast-forward timers for the retries (Retry 1: 100ms, Retry 2: 200ms)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100); // Trigger 2nd attempt
        await jest.advanceTimersByTimeAsync(200); // Trigger 3rd attempt
      });

      const res = await executePromise;

      expect(mockApiFunc).toHaveBeenCalledTimes(3);
      expect(res).toEqual({ success: true });
      expect(result.current.error).toBeNull();
    });

    it('should throw error after maximum retries are exhausted if network does not recover', async () => {
      const mockApiFunc = jest.fn().mockRejectedValue(new Error('Persistent network failure'));

      const { result } = renderHook(() =>
        useApi(mockApiFunc, { retryCount: 2, retryDelay: 100 })
      );

      let errorThrown: any = null;
      act(() => {
        result.current.execute().catch((err) => {
          errorThrown = err;
        });
      });

      // Advance timers for 2 retries (Retry 1: 100ms, Retry 2: 200ms)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
        await jest.advanceTimersByTimeAsync(200);
      });

      expect(mockApiFunc).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toBe('Persistent network failure');
      expect(result.current.error).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Real-time Channel Disconnection & Polling Fallback Recovery
  // ---------------------------------------------------------------------------
  describe('Scenario 2: Real-time Channel Drops & Polling Fallback', () => {
    it('should announce new orders fetched via periodic polling when real-time channel is disconnected', async () => {
      const initialOrders: Order[] = [];
      const { result, rerender } = renderHook(({ ords }) => useTTS(ords, true, true), {
        initialProps: { ords: initialOrders },
      });

      // Simulating a real-time websocket disconnect.
      // In this state, the page falls back to the periodic polling fetchOrders loop.
      // A new order is fetched through the polling loop.
      const newOrdersPolled: Order[] = [
        {
          id: 'polled-order-1',
          tableId: 'Meja-5',
          type: 'guest',
          status: 'pending',
          orderMode: 'dine-in',
          items: [{ name: 'Ayam Goreng', qty: 2, category: 'Makanan', price: 15000 }],
          notes: '',
          created_at: new Date().toISOString(),
          total_amount: 30000,
        } as any
      ];

      // Rerender with polled orders (simulating the state update from the polling loop)
      rerender({ ords: newOrdersPolled });

      // Fast forward time to process TTS queue
      await jest.advanceTimersByTimeAsync(5000);

      // Verify that the order from the polling fallback was successfully announced via TTS
      expect(speakSpy).toHaveBeenCalledTimes(1);
      const textAnnounced = speakSpy.mock.calls[0][0].text;
      expect(textAnnounced).toContain('Pesanan untuk dapur baru masuk');
      expect(textAnnounced).toContain('Meja Meja-5');
      expect(textAnnounced).toContain('Ayam Goreng dua');
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Multi-Tab Race Conditions (Concurrent State Updates)
  // ---------------------------------------------------------------------------
  describe('Scenario 3: Concurrent State Updates & Optimistic UI Resilience', () => {
    it('should handle race condition updates where state transitions are processed concurrently', async () => {
      // Render the hook without initial orders so it doesn't trigger automatic order announcements
      const { result: ttsHook } = renderHook(() => useTTS([], true, true));

      // Simulate a direct manual trigger of status changes from two different actions concurrently
      act(() => {
        ttsHook.current.speak('Pesanan meja Meja-2 siap untuk diantarkan.');
      });
      act(() => {
        ttsHook.current.speak('Pesanan meja Meja-2 sudah disajikan.');
      });

      // Verify they are both added to the ttsQueue and processed sequentially without collisions
      await jest.advanceTimersByTimeAsync(10000);

      expect(speakSpy).toHaveBeenCalledTimes(2);
      expect(speakSpy.mock.calls[0][0].text).toBe('Pesanan meja Meja-2 siap untuk diantarkan.');
      expect(speakSpy.mock.calls[1][0].text).toBe('Pesanan meja Meja-2 sudah disajikan.');
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Extreme Payload & Text Stress (Buffer Overflow & Stuck Engine)
  // ---------------------------------------------------------------------------
  describe('Scenario 4: Extreme Payload & Text Stress Test', () => {
    it('should process an extreme order of 50+ items and extremely long notes gracefully without hanging', async () => {
      // 50 unique items
      const extremeItems = Array.from({ length: 50 }, (_, i) => ({
        name: `Item Makan Spesial Ke ${i + 1}`,
        qty: 1,
        category: 'Makanan',
        price: 10000,
      }));

      const longChefNote = 'Mohon jangan terlalu pedas. Potong ayamnya agak kecil-kecil. ' +
        'Garamnya sedikit saja. Sayurnya dipisah. Sambalnya dibungkus tersendiri. ' +
        'Jangan pakai penyedap rasa buatan. Gorengnya sampai kering sekali. ' +
        'Gelas minumannya pakai yang besar. Es batu dipisah di mangkok kecil. ' +
        'Sendok dan garpu dibersihkan dengan tisu basah. ' +
        'Tolong antarkan pelan-pelan karena membawa anak kecil. '.repeat(5); // ~1000 characters

      const extremeOrder: Order = {
        id: 'extreme-order-99',
        tableId: 'Meja-99',
        type: 'guest',
        status: 'pending',
        orderMode: 'dine-in',
        items: extremeItems,
        notes: longChefNote,
        created_at: new Date().toISOString(),
        total_amount: 500000,
      } as any;

      const { rerender } = renderHook(({ ords }) => useTTS(ords, true, true), {
        initialProps: { ords: [] as Order[] },
      });

      // Add the extreme order
      rerender({ ords: [extremeOrder] });

      // Fast-forward to start speaking
      await jest.advanceTimersByTimeAsync(1000);

      expect(speakSpy).toHaveBeenCalled();
      const largeText = speakSpy.mock.calls[0][0].text;
      
      // Confirm the generated announcement matches the specifications
      expect(largeText).toContain('Meja Meja-99');
      expect(largeText).toContain('Catatan untuk shef');
      expect(largeText).toContain('Mohon segera diproses.');
      
      // Verify that the speech synthesis can handle long texts without crashing
      // Also verify that the safety net timer would resolve the promise if it hangs
      await jest.advanceTimersByTimeAsync(30000);
      expect(speakSpy).toHaveBeenCalledTimes(1);
    });

    it('should safely recover using the safety net if browser SpeechSynthesis gets stuck', async () => {
      // Create a mock speak implementation that NEVER calls onend (simulating a stuck browser speech engine)
      speakSpy.mockImplementation(() => {
        // Do nothing, simulate hang/stuck state
      });

      const { result } = renderHook(() => useTTS([], true, true));

      act(() => {
        result.current.speak('Pengumuman Tes Macet');
        result.current.speak('Pengumuman Kedua Setelah Pulih');
      });

      // Verify first speak was called
      expect(speakSpy).toHaveBeenCalledTimes(1);
      expect(speakSpy.mock.calls[0][0].text).toBe('Pengumuman Tes Macet');

      // The queue is now waiting for the first item to finish.
      // Since it's stuck (no onend callback), advancing time by a short duration shouldn't trigger the second item.
      await jest.advanceTimersByTimeAsync(5000);
      expect(speakSpy).toHaveBeenCalledTimes(1);

      // Fast forward past the 25-second safety net timeout + 2-second spacing delay
      await jest.advanceTimersByTimeAsync(23000);

      // The safety net should have resolved the stuck speech, allowing the queue processor to move to the second item!
      expect(speakSpy).toHaveBeenCalledTimes(2);
      expect(speakSpy.mock.calls[1][0].text).toBe('Pengumuman Kedua Setelah Pulih');
    });
  });
});
