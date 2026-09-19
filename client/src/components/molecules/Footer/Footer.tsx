import { FooterLink, FooterWrapper } from './Footer.styles';

const LINKEDIN_URL = 'https://www.linkedin.com/in/ramos-souza/';
const GITHUB_URL =
  'https://github.com/brain-ag/trabalhe-conosco#brain-agriculture---teste-t%C3%A9cnico-v2';

export function Footer(): React.JSX.Element {
  return (
    <FooterWrapper role="contentinfo">
      <span>Desenvolvido por </span>
      <FooterLink
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn de Ramos de Souza Janones"
      >
        Ramos de Souza Janones
      </FooterLink>
      <span> para o </span>
      <FooterLink
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Repositório do Teste Técnico Brain Agriculture v2"
      >
        Brain Agriculture - Teste Técnico v2
      </FooterLink>
    </FooterWrapper>
  );
}
