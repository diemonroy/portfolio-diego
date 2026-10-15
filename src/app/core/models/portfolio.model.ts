export interface PortfolioData {
  nav: NavData;
  hero: HeroData;
  projectsSection: ProjectsSectionData;
  projects: ProjectItem[];
  quote: string;
  about: AboutData;
  howIWork: HowIWorkData;
  footer: FooterData;
}

export interface NavData {
  home: string;
  projects: string;
  about: string;
  how: string;
  contact: string;
}

export interface HeroMetric {
  value: string;
  label: string;
  sub?: string;
}

export interface HeroData {
  role: string;
  firstName: string;
  lastName: string;
  phrase: string;
  rotatingWords: string[];
  ctaPrimary: string;
  ctaSecondary: string;
  scrollInd: string;
  statusBadge?: string;
  metrics?: HeroMetric[];
}

export interface ProjectsSectionData {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  btnMore: string;
  overlay: {
    challengeTitle: string;
    roleTitle: string;
    resultTitle: string;
  };
}

export interface ProjectItem {
  id: string;
  category: string;
  title: string;
  description: string;
  image: string;
  overlayImage: string;
  overlaySummary: string;
  challenge: string;
  roleHtml: string;
  result: string;
}

export interface AboutData {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  tabs: {
    experience: string;
    education: string;
    skills: string;
    tools: string;
  };
  experienceHtml: string;
  educationHtml: string;
  skillsHtml: string;
  toolsHtml: string;
}

export interface HowIWorkData {
  eyebrow: string;
  title: string;
  cards: HowCard[];
}

export interface HowCard {
  number: string;
  title: string;
  description: string;
}

export interface FooterData {
  eyebrow?: string;
  title: string;
  cta: string;
  copyrightRole?: string;
}
