import styled from 'styled-components';

const Chip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.softTint : theme.colors.surface};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primaryDark : theme.colors.text};
  cursor: pointer;
`;

interface CropChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function CropChip({
  label,
  selected,
  onToggle,
}: CropChipProps): React.JSX.Element {
  return (
    <Chip type="button" $selected={selected} onClick={onToggle} aria-pressed={selected}>
      {selected ? '✓ ' : null}
      {label}
    </Chip>
  );
}
