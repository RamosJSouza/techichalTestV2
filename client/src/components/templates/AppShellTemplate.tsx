import { useEffect } from 'react';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../organisms/AppSidebar';
import { AppHeader } from '../organisms/AppHeader';
import { Footer } from '../molecules/Footer';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { clearToast } from '../../store/slices/uiSlice';

const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
`;

const MainColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Canvas = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  max-width: ${({ theme }) => theme.layout.canvasMax};
  width: 100%;
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const Toast = styled.div<{ $variant: string }>`
  position: fixed;
  right: 16px;
  bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ theme, $variant }) =>
    $variant === 'error' ? theme.colors.dangerBg : theme.colors.successBg};
  color: ${({ theme, $variant }) =>
    $variant === 'error' ? theme.colors.danger : theme.colors.primaryDark};
  border: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 50;
  box-shadow: ${({ theme }) => theme.shadows.level2};
`;

export function AppShellTemplate(): React.JSX.Element {
  const toast = useAppSelector((s) => s.ui.toast);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch(clearToast());
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, dispatch]);

  return (
    <Shell>
      <AppSidebar />
      <MainColumn>
        <AppHeader />
        <Canvas>
          <Outlet />
        </Canvas>
        <Footer />
      </MainColumn>
      {toast ? (
        <Toast $variant={toast.variant} role="status">
          {toast.message}
        </Toast>
      ) : null}
    </Shell>
  );
}
