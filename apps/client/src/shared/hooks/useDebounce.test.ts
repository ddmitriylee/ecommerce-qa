import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-DEB-UNIT-01: returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('TC-DEB-UNIT-02: does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    rerender({ value: 'world', delay: 300 });

    // Value should still be 'hello' before timeout
    expect(result.current).toBe('hello');
  });

  it('TC-DEB-UNIT-03: updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    rerender({ value: 'world', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('TC-DEB-UNIT-04: resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    // Rapid changes
    rerender({ value: 'ab', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'abc', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'abcd', delay: 300 });

    // Not enough time has passed since last change
    expect(result.current).toBe('a');

    // Wait full delay from last change
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('abcd');
  });

  it('TC-DEB-UNIT-05: uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    // Not updated at 250ms
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current).toBe('initial');

    // Updated at 300ms
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toBe('changed');
  });

  it('TC-DEB-UNIT-06: works with number type', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(42);
  });

  it('TC-DEB-EDGE-01: handles undefined value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'test' as string | undefined } }
    );

    rerender({ value: undefined });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBeUndefined();
  });
});
