import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('booked'), subject: 'Your Neuron Garage call is booked', displayName: 'Prospect — Call booked', previewData: portalPreview } satisfies TemplateEntry