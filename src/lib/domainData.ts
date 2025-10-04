import { Heart, Scale, Building2, Plane, BookOpen, Briefcase, Cpu, Globe, LucideIcon } from 'lucide-react';

export interface Domain {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category: 'specialized' | 'general' | 'creative';
  subdomains?: string[];
  keywords?: string[];
  popular?: boolean;
}

export const DOMAINS: Domain[] = [
  // Specialized Domains
  {
    id: 'medical',
    name: 'Medical & Healthcare',
    description: 'Medical terminology, pharmaceuticals, clinical trials, patient care documents',
    icon: Heart,
    color: 'text-red-500',
    category: 'specialized',
    subdomains: ['Pharmaceuticals', 'Clinical Trials', 'Patient Care', 'Medical Devices'],
    keywords: ['diagnosis', 'treatment', 'medication', 'clinical', 'patient'],
    popular: true,
  },
  {
    id: 'legal',
    name: 'Legal & Compliance',
    description: 'Contracts, regulatory documents, compliance materials, legal proceedings',
    icon: Scale,
    color: 'text-blue-600',
    category: 'specialized',
    subdomains: ['Contracts', 'Regulatory', 'Litigation', 'Intellectual Property'],
    keywords: ['contract', 'agreement', 'compliance', 'regulation', 'legal'],
    popular: true,
  },
  {
    id: 'financial',
    name: 'Financial & Banking',
    description: 'Financial reports, banking documents, investment materials, accounting',
    icon: Building2,
    color: 'text-green-600',
    category: 'specialized',
    subdomains: ['Banking', 'Investment', 'Accounting', 'Insurance'],
    keywords: ['financial', 'investment', 'banking', 'accounting', 'revenue'],
    popular: true,
  },
  {
    id: 'technical',
    name: 'Technical & IT',
    description: 'Software documentation, user manuals, technical specifications, IT content',
    icon: Cpu,
    color: 'text-purple-600',
    category: 'specialized',
    subdomains: ['Software', 'Hardware', 'Networking', 'Cybersecurity'],
    keywords: ['software', 'technical', 'specification', 'manual', 'documentation'],
    popular: true,
  },

  // General Domains
  {
    id: 'general',
    name: 'General Translation',
    description: 'General-purpose content, everyday language, non-specialized materials',
    icon: Globe,
    color: 'text-gray-600',
    category: 'general',
    keywords: ['general', 'everyday', 'common', 'standard'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business & Corporate',
    description: 'Business communications, corporate materials, presentations, reports',
    icon: Briefcase,
    color: 'text-indigo-600',
    category: 'general',
    subdomains: ['Marketing', 'Sales', 'HR', 'Operations'],
    keywords: ['business', 'corporate', 'presentation', 'report', 'communication'],
    popular: true,
  },

  // Creative Domains
  {
    id: 'marketing',
    name: 'Marketing & Advertising',
    description: 'Marketing campaigns, advertising copy, brand materials, social media content',
    icon: Plane,
    color: 'text-orange-600',
    category: 'creative',
    subdomains: ['Advertising', 'Social Media', 'Content Marketing', 'SEO'],
    keywords: ['marketing', 'advertising', 'campaign', 'brand', 'content'],
  },
  {
    id: 'publishing',
    name: 'Publishing & Media',
    description: 'Books, articles, journalism, editorial content, media publications',
    icon: BookOpen,
    color: 'text-pink-600',
    category: 'creative',
    subdomains: ['Books', 'Journalism', 'Editorial', 'Academic'],
    keywords: ['publishing', 'editorial', 'journalism', 'article', 'book'],
  },
];

export const DOMAIN_CATEGORIES = {
  'specialized': {
    label: 'Specialized',
    description: 'Industry-specific terminology and expertise required',
    domains: DOMAINS.filter(d => d.category === 'specialized'),
  },
  'general': {
    label: 'General',
    description: 'Everyday language and common business content',
    domains: DOMAINS.filter(d => d.category === 'general'),
  },
  'creative': {
    label: 'Creative',
    description: 'Marketing, media, and creative content',
    domains: DOMAINS.filter(d => d.category === 'creative'),
  },
};

export const getDomainById = (id: string): Domain | undefined => {
  return DOMAINS.find(domain => domain.id === id);
};

export const getDomainsByCategory = (category: Domain['category']): Domain[] => {
  return DOMAINS.filter(domain => domain.category === category);
};

export const getPopularDomains = (): Domain[] => {
  return DOMAINS.filter(domain => domain.popular);
};

export const searchDomains = (query: string): Domain[] => {
  const lowerQuery = query.toLowerCase();
  return DOMAINS.filter(domain => 
    domain.name.toLowerCase().includes(lowerQuery) ||
    domain.description.toLowerCase().includes(lowerQuery) ||
    domain.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
};
