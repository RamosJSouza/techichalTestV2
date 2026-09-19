import styled from 'styled-components';

const Chip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.softTint : theme.colors.canvas};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryDark : theme.colors.textSecondary};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
`;

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({
  label,
  active,
  onClick,
}: FilterChipProps): React.JSX.Element {
  return (
    <Chip type="button" $active={active} onClick={onClick}>
      {label}
    </Chip>
  );
}
