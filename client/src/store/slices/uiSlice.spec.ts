import { uiReducer, toggleSidebar } from './uiSlice';

describe('uiSlice', () => {
  it('alterna sidebarCollapsed', () => {
    const state = uiReducer(undefined, { type: 'unknown' });
    expect(state.sidebarCollapsed).toBe(false);
    const next = uiReducer(state, toggleSidebar());
    expect(next.sidebarCollapsed).toBe(true);
  });
});
