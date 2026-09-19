import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Footer } from './Footer';
import { theme } from '../../../shared/theme/theme';

const LINKEDIN_URL = 'https://www.linkedin.com/in/ramos-souza/';
const GITHUB_URL =
  'https://github.com/brain-ag/trabalhe-conosco#brain-agriculture---teste-t%C3%A9cnico-v2';

describe('Footer', () => {
  function renderFooter(): void {
    render(
      <ThemeProvider theme={theme}>
        <Footer />
      </ThemeProvider>,
    );
  }

  it('renderiza o texto principal do rodapé', () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Desenvolvido por Ramos de Souza Janones para o Brain Agriculture - Teste Técnico v2',
    );
  });

  it('renderiza o link do LinkedIn com href, target e rel corretos', () => {
    renderFooter();
    const linkedin = screen.getByRole('link', {
      name: /LinkedIn de Ramos de Souza Janones/i,
    });
    expect(linkedin).toHaveAttribute('href', LINKEDIN_URL);
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renderiza o link do GitHub com href, target e rel corretos', () => {
    renderFooter();
    const github = screen.getByRole('link', {
      name: /Repositório do Teste Técnico Brain Agriculture v2/i,
    });
    expect(github).toHaveAttribute('href', GITHUB_URL);
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('usa a tag semântica <footer> (role contentinfo)', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.tagName).toBe('FOOTER');
  });
});
