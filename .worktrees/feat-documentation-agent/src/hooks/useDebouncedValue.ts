import { useState, useEffect } from 'react';

/**
 * A custom hook that creates a debounced version of a value.
 * 
 * @template T The type of the value to be debounced
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns An array containing [debouncedValue, immediateValue]
 *          - debouncedValue: The value after the specified delay has passed
 *          - immediateValue: The current value (useful for displaying in UI immediately)
 */
function useDebouncedValue<T>(value: T, delay = 500): [T, T] {
  // State to hold the immediate value (for UI updates)
  const [immediateValue, setImmediateValue] = useState<T>(value);
  
  // State to hold the debounced value (for processing/API calls)
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update the immediate value right away
    setImmediateValue(value);
    
    // Set up the debounce timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Clean up the timeout on unmount or when value/delay changes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return [debouncedValue, immediateValue];
}

export default useDebouncedValue; 