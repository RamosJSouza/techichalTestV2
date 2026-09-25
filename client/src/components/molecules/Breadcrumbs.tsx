import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Icon } from '../atoms/Icon';

interface Crumb {
  label: string;
  to?: string;
}

const Nav = styled.nav`
  min-width: 0;
  flex: 1;
  font-size: 0.875rem;
`;

const List = styled.ol`
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 0;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

const CrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Current = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export function crumbsForPath(pathname: string): Crumb[] {
  const home: Crumb = { label: 'Visão geral', to: '/' };
  const producers: Crumb = { label: 'Produtores', to: '/producers' };

  if (pathname === '/' || pathname === '') {
    return [{ label: 'Visão geral' }];
  }
  if (pathname === '/producers') {
    return [home, { label: 'Produtores' }];
  }
  if (pathname === '/producers/new') {
    return [home, producers, { label: 'Novo produtor' }];
  }
  if (/^\/producers\/[^/]+\/edit$/.test(pathname)) {
    return [home, producers, { label: 'Editar produtor' }];
  }
  if (/^\/producers\/[^/]+\/esg$/.test(pathname)) {
    return [home, producers, { label: 'Parecer' }];
  }
  return [{ label: 'Visão geral' }];
}

export function Breadcrumbs(): React.JSX.Element {
  const { pathname } = useLocation();
  const crumbs = crumbsForPath(pathname);

  return (
    <Nav aria-label="Você está em">
      <List>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Item key={crumb.label}>
              {index > 0 ? <Icon name="chevron_right" size={16} /> : null}
              {last || !crumb.to ? (
                <Current>{crumb.label}</Current>
              ) : (
                <CrumbLink to={crumb.to}>{crumb.label}</CrumbLink>
              )}
            </Item>
          );
        })}
      </List>
    </Nav>
  );
}
