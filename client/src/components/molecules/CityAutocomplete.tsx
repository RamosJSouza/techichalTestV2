import { useEffect, useDeferredValue, useId, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useLazyListCitiesQuery } from '../../store/api/apiSlice';

const Wrapper = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Control = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: 0.9375rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const Listbox = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: 0;
  list-style: none;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  box-shadow: ${({ theme }) => theme.shadows.level1};
  max-height: 200px;
  overflow-y: auto;
`;

const Option = styled.li<{ $active: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.softTint : 'transparent'};

  &:hover {
    background: ${({ theme }) => theme.colors.softTint};
  }
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.75rem;
`;

interface CityAutocompleteProps {
  uf: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function CityAutocomplete({
  uf,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: CityAutocompleteProps): React.JSX.Element {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const [trigger, { data: cities, isFetching }] = useLazyListCitiesQuery();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const deferredTerm = useDeferredValue(value);

  useEffect(() => {
    if (uf.length === 2) {
      void trigger(uf, true);
    }
  }, [uf, trigger]);

  const filtered = useMemo(() => {
    if (!cities || cities.length === 0) {
      return [];
    }
    const term = normalize(deferredTerm);
    if (!term) {
      return cities;
    }
    return cities.filter((city) => normalize(city).includes(term));
  }, [cities, deferredTerm]);

  const showDropdown = open && filtered.length > 0 && !isFetching;

  const selectOption = (city: string): void => {
    onChange(city);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!open && filtered.length > 0) {
          setOpen(true);
          setActiveIndex(0);
          return;
        }
        setActiveIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev,
        );
        return;
      }
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      case 'Enter':
        if (open && activeIndex >= 0 && filtered[activeIndex]) {
          e.preventDefault();
          selectOption(filtered[activeIndex]!);
        }
        return;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        return;
      default:
        return;
    }
  };

  return (
    <Wrapper htmlFor={autoId}>
      Cidade
      <Control>
        <Input
          id={autoId}
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          disabled={disabled}
          placeholder={placeholder ?? 'Digite ou selecione a cidade'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
        />
        {showDropdown ? (
          <Listbox id={listboxId} role="listbox">
            {filtered.map((city, index) => (
              <Option
                key={city}
                $active={index === activeIndex}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(city);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {city}
              </Option>
            ))}
          </Listbox>
        ) : null}
      </Control>
      {error ? <Hint role="alert">{error}</Hint> : null}
    </Wrapper>
  );
}
