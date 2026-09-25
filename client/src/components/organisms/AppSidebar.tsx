import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { Icon } from '../atoms/Icon';

const Aside = styled.aside<{ $collapsed: boolean }>`
  width: ${({ theme, $collapsed }) =>
    $collapsed ? theme.layout.sidebarCollapsed : theme.layout.sidebarWidth};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  transition: width 160ms ease;
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    position: fixed;
    z-index: 40;
    transform: translateX(${({ $collapsed }) => ($collapsed ? '-100%' : '0')});
    width: ${({ theme }) => theme.layout.sidebarWidth};
  }

  @media (min-width: 768px) and (max-width: ${({ theme }) =>
      theme.breakpoints.tabletMax}) {
    width: ${({ theme }) => theme.layout.sidebarCollapsed};
  }
`;

const Brand = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;

  span.full {
    @media (min-width: 768px) and (max-width: ${({ theme }) =>
        theme.breakpoints.tabletMax}) {
      display: none;
    }
  }

  span.short {
    display: none;
    @media (min-width: 768px) and (max-width: ${({ theme }) =>
        theme.breakpoints.tabletMax}) {
      display: inline;
    }
  }
`;

const IconButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  color: inherit;
  padding: 0;
`;

const LinkItem = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.textSecondary};

  &.active {
    background: ${({ theme }) => theme.colors.softTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    font-weight: 600;
  }

  span.label {
    display: ${({ $collapsed }) => ($collapsed ? 'none' : 'inline')};
  }

  @media (min-width: 768px) and (max-width: ${({ theme }) =>
      theme.breakpoints.tabletMax}) {
    span.label {
      display: none;
    }
  }
`;

export function AppSidebar(): React.JSX.Element {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <Aside $collapsed={collapsed} aria-label="Navegação principal">
      <Brand>
        {!collapsed ? (
          <>
            <span className="full">Brain Agriculture</span>
            <span className="short">BA</span>
          </>
        ) : (
          'BA'
        )}
        <IconButton
          type="button"
          aria-label={collapsed ? 'Abrir menu' : 'Recolher menu'}
          onClick={() => dispatch(toggleSidebar())}
        >
          <Icon name={collapsed ? 'menu' : 'menu_open'} />
        </IconButton>
      </Brand>
      <LinkItem to="/" end $collapsed={collapsed} aria-label="Visão geral">
        <Icon name="space_dashboard" />
        <span className="label">Visão geral</span>
      </LinkItem>
      <LinkItem to="/producers" $collapsed={collapsed} aria-label="Produtores">
        <Icon name="agriculture" />
        <span className="label">Produtores</span>
      </LinkItem>
      <LinkItem
        to="/producers/new"
        $collapsed={collapsed}
        aria-label="Novo produtor"
      >
        <Icon name="person_add" />
        <span className="label">Novo produtor</span>
      </LinkItem>
    </Aside>
  );
}
