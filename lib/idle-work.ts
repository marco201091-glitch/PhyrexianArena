type IdleWorkOptions = {
  /** Run within this many ms even if the browser stays busy. */
  timeoutMs?: number;
};

export function runWhenIdle(
  task: () => void | Promise<void>,
  options: IdleWorkOptions = {},
) {
  if (typeof window === 'undefined') {
    void task();
    return;
  }

  const timeoutMs = options.timeoutMs ?? 4000;
  const run = () => {
    void task();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: timeoutMs });
    return;
  }

  globalThis.setTimeout(run, Math.min(timeoutMs, 1500));
}