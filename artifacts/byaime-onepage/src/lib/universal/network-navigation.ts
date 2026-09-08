export async function openSelectedWorld(
  worldId: string,
  selectProject: (id: string) => Promise<boolean>,
  navigate: (path: string) => void,
): Promise<boolean> {
  const selected = await selectProject(worldId);
  if (!selected) return false;
  navigate('/user-portal');
  return true;
}