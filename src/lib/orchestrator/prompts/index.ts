import fs from 'fs';
import path from 'path';

export type AppType = 'ecommerce' | 'booking' | 'infobiz';

const PROMPTS_DIR = path.join(process.cwd(), 'src', 'lib', 'orchestrator', 'prompts');

/**
 * Load the intake prompt for a specific business type.
 */
export function getIntakePrompt(appType: AppType): string {
  const filePath = path.join(PROMPTS_DIR, `${appType}-intake.md`);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Load the main config-generation system prompt.
 */
export function getSystemPrompt(): string {
  const filePath = path.join(PROMPTS_DIR, 'config-generation.md');
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Build the full system prompt for an LLM call: system instructions + intake checklist.
 */
export function buildFullPrompt(appType: AppType): string {
  const system = getSystemPrompt();
  const intake = getIntakePrompt(appType);
  return `${system}\n\n---\n\n# Intake Checklist for ${appType}\n\n${intake}`;
}

/**
 * The structured brief that the orchestrator form produces.
 * This is what the LLM receives as input (after form parsing).
 */
export interface OrchestratorBrief {
  appType: AppType;
  name: string;
  locale: 'ru' | 'en';
  currency: string;

  items: Array<{
    name: string;
    price: number;
    category?: string;
    description?: string;
    image_filename?: string;
    stock_quantity?: number;
    duration?: number;
    type?: 'article' | 'pdf' | 'course' | 'consultation';
    slug?: string;
    content?: string;
    external_url?: string;
  }>;

  slug?: string;
  primaryColor?: string;
  secondaryColor?: string;
  subtitle?: string;
  phone?: string;
  address?: string;

  // Booking
  staff?: Array<{ name: string; bio?: string; image_filename?: string }>;
  workingHours?: string;

  // Infobiz
  author?: {
    name: string;
    title?: string;
    bio?: string;
    photo_filename?: string;
    credentials?: string[];
  };

  // Marketing
  features?: Array<{ icon: string; title: string; description: string }>;
  testimonials?: Array<{ name: string; role?: string; rating?: number; text: string }>;
  faq?: Array<{ question: string; answer: string }>;
  promoText?: string;

  // Pre-uploaded assets mapping
  uploadedAssets?: Record<string, string>;
}
