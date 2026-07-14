export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runTasksWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  task: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, concurrency);
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}