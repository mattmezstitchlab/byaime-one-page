export async function openSelectedWorld(worldId, selectProject, navigate) {
    const selected = await selectProject(worldId);
    if (!selected)
        return false;
    navigate('/user-portal');
    return true;
}
//# sourceMappingURL=network-navigation.js.map