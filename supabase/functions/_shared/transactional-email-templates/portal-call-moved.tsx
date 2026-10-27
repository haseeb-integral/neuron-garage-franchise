import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('moved'), subject: 'Your Neuron Garage call time has changed', displayName: 'Prospect — Call moved', previewData: portalPreview } satisfies TemplateEntry