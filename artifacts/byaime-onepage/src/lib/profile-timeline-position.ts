export function createTimelinePositioner(
  times: number[],
  start = 1100,
  end = 2900,
) {
  const finiteTimes = times.filter(Number.isFinite);
  const minTime = finiteTimes.length > 0 ? Math.min(...finiteTimes) : 0;
  const maxTime = finiteTimes.length > 0 ? Math.max(...finiteTimes) : 0;
  const span = maxTime - minTime;
  const width = end - start;

  return (time: number) => {
    if (finiteTimes.length === 0 || span === 0 || !Number.isFinite(time)) {
      return start + width / 2;
    }
    const progress = Math.min(1, Math.max(0, (time - minTime) / span));
    return start + progress * width;
  };
}