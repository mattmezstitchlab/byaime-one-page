export function isCurrentRevision(currentRevision: number, completedRevision: number) {
  return currentRevision === completedRevision;
}