import { describe, expect, it, vi } from 'vitest';
import { openSelectedWorld } from './network-navigation';

describe('network World navigation', () => {
  it('activates the selected World before opening the portal', async () => {
    const selectProject = vi.fn(async () => true);
    const navigate = vi.fn();

    await expect(openSelectedWorld('world-b', selectProject, navigate)).resolves.toBe(true);
    expect(selectProject).toHaveBeenCalledWith('world-b');
    expect(navigate).toHaveBeenCalledWith('/user-portal');
    expect(selectProject.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0],
    );
  });

  it('stays on the network when activation fails', async () => {
    const navigate = vi.fn();

    await expect(openSelectedWorld('world-b', async () => false, navigate)).resolves.toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});