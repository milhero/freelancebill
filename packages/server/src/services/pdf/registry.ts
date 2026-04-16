import type { PdfTemplateFunction } from './types.js';
import { renderStandard } from './templates/standard.js';
import { renderModernMinimal } from './templates/modernMinimal.js';
import { renderSeriosKlassisch } from './templates/seriosKlassisch.js';
import { renderFreelancerKompakt } from './templates/freelancerKompakt.js';
import { renderAgentur } from './templates/agentur.js';
import { renderHandwerk } from './templates/handwerk.js';
import { renderBeratung } from './templates/beratung.js';
import { renderDienstleistung } from './templates/dienstleistung.js';

export const TEMPLATE_REGISTRY: Record<string, PdfTemplateFunction> = {
  'standard': renderStandard,
  'modern-minimal': renderModernMinimal,
  'serios-klassisch': renderSeriosKlassisch,
  'freelancer-kompakt': renderFreelancerKompakt,
  'agentur': renderAgentur,
  'handwerk': renderHandwerk,
  'beratung': renderBeratung,
  'dienstleistung': renderDienstleistung,
};
