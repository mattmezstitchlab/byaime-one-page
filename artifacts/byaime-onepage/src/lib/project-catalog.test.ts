import { describe, expect, it } from 'vitest';
import {
  projectCatalogFromRows,
  roleForActiveProject,
  shouldCreateProject,
} from './project-catalog';

describe('project catalog synchronization', () => {
  it('keeps a newly accessible existing World as viewer instead of recreating it', () => {
    const catalog = projectCatalogFromRows([
      { id: 'world-a', title: 'Monde A', role: 'owner', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'world-b', title: 'Monde B', role: 'viewer', updatedAt: '2026-01-02T00:00:00Z' },
    ]);

    expect(roleForActiveProject('world-b', catalog)).toBe('viewer');
    expect(shouldCreateProject('world-b', catalog, '2026-01-02T00:00:00Z')).toBe(false);
  });

  it('never treats an unknown existing World as owner', () => {
    expect(roleForActiveProject('unknown', [])).toBe('viewer');
  });
});