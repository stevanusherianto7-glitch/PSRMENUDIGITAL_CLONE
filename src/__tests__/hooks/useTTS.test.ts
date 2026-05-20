import { renderHook } from '@testing-library/react';
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

describe('useTTS Concurrent Orders Test', () => {
  let speakSpy: jest.SpyInstance;
  let cancelSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock window.speechSynthesis
    speakSpy = jest.fn().mockImplementation((utterance) => {
      // Simulate speaking completion instantly in test environment by triggering onend callback
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

  const generateOrders = (count: number, offset: number = 0): Order[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `order-${offset + i + 1}`,
      tableId: `Meja-${offset + i + 1}`,
      type: 'guest',
      status: 'pending',
      orderMode: 'dine-in',
      items: [
        { name: 'Nasi Goreng', qty: 1, category: 'Makanan', price: 20000 }
      ],
      notes: '',
      created_at: new Date().toISOString(),
      total_amount: 20000,
    } as any));
  };

  it('should queue and speak all 9 concurrent orders in sequential order', async () => {
    const orders = generateOrders(9, 0);
    
    // Render hook with initial state (first load: marks orders as known, doesn't announce)
    const { rerender } = renderHook(({ ords }) => useTTS(ords, true, true), {
      initialProps: { ords: [] as Order[] },
    });

    // Add 9 orders simultaneously (like concurrent orders arriving)
    rerender({ ords: orders });

    // Fast-forward time so that all queued items finish speaking (9 items * (50ms speak + 2000ms pause) = ~18.5 seconds)
    // Let's advance by 30 seconds
    await jest.advanceTimersByTimeAsync(30000);

    // Assert speech synthesis speak was called 9 times
    expect(speakSpy).toHaveBeenCalledTimes(9);
  });

  it('should NOT lose queued announcements even if orders array changes due to subsequent update before all speak calls are made', async () => {
    const initialOrders = generateOrders(9, 10); // Offset 10
    
    // First load
    const { rerender } = renderHook(({ ords }) => useTTS(ords, true, true), {
      initialProps: { ords: [] as Order[] },
    });

    // Simulate 9 orders arriving
    rerender({ ords: initialOrders });

    // Advance by 5 seconds (first and second orders should have been announced)
    await jest.advanceTimersByTimeAsync(5000);
    expect(speakSpy).toHaveBeenCalled();

    const initialCallsCount = speakSpy.mock.calls.length;
    expect(initialCallsCount).toBeGreaterThan(0);
    expect(initialCallsCount).toBeLessThan(9);

    // Now, simulate a subsequent update to the orders array (e.g. an order is updated or status changes)
    // With Opsi 2, this update should NOT clear the persistent ttsQueue
    const updatedOrders = initialOrders.map(o => o.id === 'order-11' ? { ...o, status: 'processing' } as Order : o);
    rerender({ ords: updatedOrders });

    // Advance time by 40 seconds (long enough for all 9 orders to be announced)
    await jest.advanceTimersByTimeAsync(40000);

    // Speech synthesis speak should have been called for all 9 orders!
    expect(speakSpy).toHaveBeenCalledTimes(9);
  });
});
