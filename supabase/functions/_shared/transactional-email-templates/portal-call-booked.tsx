import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('booked'), subject: 'Looking forward to our next Neuron Garage conversation', displayName: 'Prospect — Call booked', previewData: portalPreview } satisfies TemplateEntry