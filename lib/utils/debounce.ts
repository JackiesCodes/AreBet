/**
 * Trailing-edge debounce. Returns a function with cancel().
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }) as ((...args: Parameters<T>) => void) & { cancel: () => void }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}
