import styled from 'styled-components';
import { Icon } from '../atoms/Icon';

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
`;

const Control = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Leading = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  color: ${({ theme }) => theme.colors.textSecondary};
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 40px 0 40px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9375rem;
  box-shadow: ${({ theme }) => theme.shadows.level1};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
  }

  &::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }
`;

const Clear = styled.button`
  position: absolute;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.full};
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.canvas};
    color: ${({ theme }) => theme.colors.text};
  }
`;

interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  id?: string;
}

export function SearchField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  id,
}: SearchFieldProps): React.JSX.Element {
  const inputId = id ?? 'producers-search';

  return (
    <Field htmlFor={inputId}>
      {label}
      <Control>
        <Leading aria-hidden>
          <Icon name="search" size={20} />
        </Leading>
        <Input
          id={inputId}
          type="search"
          role="searchbox"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {value.length > 0 ? (
          <Clear
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
          >
            <Icon name="close" size={18} />
          </Clear>
        ) : null}
      </Control>
    </Field>
  );
}
