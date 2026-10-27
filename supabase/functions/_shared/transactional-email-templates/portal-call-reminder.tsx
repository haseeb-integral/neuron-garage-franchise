import type { TemplateEntry } from './registry.ts'
import { noticeComponent, portalPreview } from './portal-notice.tsx'
export const template = { component: noticeComponent('reminder'), subject: 'Reminder: your Neuron Garage call is tomorrow', displayName: 'Prospect — Day-before reminder', previewData: { ...portalPreview, dateTime: '3:00 PM Mountain Time' } } satisfies TemplateEntry