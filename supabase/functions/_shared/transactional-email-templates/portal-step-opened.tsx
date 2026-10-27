import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('step'), subject: 'Your next Neuron Garage step is ready', displayName: 'Prospect — New step opens', previewData: portalPreview } satisfies TemplateEntry