import { renderHook, act } from '@testing-library/react';
import { useApi } from '../../app/hooks/useApi';

const mockApiFunction = jest.fn();
const mockSuccessData = { success: true };
const mockError = new Error('API Error');

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful API call', async () => {
    mockApiFunction.mockResolvedValue(mockSuccessData);
    
    const { result } = renderHook(() => useApi(mockApiFunction));
    
    let apiResult;
    await act(async () => {
      apiResult = await result.current.execute();
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(mockSuccessData);
    expect(apiResult).toBe(mockSuccessData);
  });

  it('should handle API error', async () => {
    mockApiFunction.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApi(mockApiFunction, { retryCount: 0 }));
    
    let apiError;
    await act(async () => {
      try {
        await result.current.execute();
      } catch (err) {
        apiError = err;
      }
    });
    
    expect(apiError).toBe(mockError);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBe(null);
  });

  it('should retry on failure', async () => {
    mockApiFunction
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(mockSuccessData);
    
    const { result } = renderHook(() => useApi(mockApiFunction, { retryCount: 1, retryDelay: 50 }));
    
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.data).toBe(mockSuccessData);
    expect(mockApiFunction).toHaveBeenCalledTimes(2);
  });
});
