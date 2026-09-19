import styled from 'styled-components';
import { SystemStatusPill } from '../molecules/SystemStatusPill';
import { Icon } from '../atoms/Icon';
import { useAppDispatch } from '../../store/store';
import { setSidebarCollapsed } from '../../store/slices/uiSlice';

const Header = styled.header`
  height: ${({ theme }) => theme.layout.headerHeight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  gap: ${({ theme }) => theme.spacing.md};
`;

const MobileToggle = styled.button`
  display: none;
  border: none;
  background: transparent;
  cursor: pointer;
  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    display: inline-flex;
  }
`;

export function AppHeader(): React.JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <Header>
      <MobileToggle
        type="button"
        aria-label="Abrir menu"
        onClick={() => {
          dispatch(setSidebarCollapsed(false));
        }}
      >
        <Icon name="menu" />
      </MobileToggle>
      <SystemStatusPill />
      <span style={{ color: '#616161', fontSize: 14 }}>AgroIntel Pro</span>
    </Header>
  );
}
