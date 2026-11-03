import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('reminder'), subject: 'See you tomorrow for our Neuron Garage conversation', displayName: 'Prospect — Day-before reminder', previewData: { ...portalPreview, dateTime: '3:00 PM Mountain Time' } } satisfies TemplateEntry