/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as dataHealthDigest } from './data-health-digest.tsx'
import { template as portalStepOpened } from './portal-step-opened.tsx'
import { template as portalCallBooked } from './portal-call-booked.tsx'
import { template as portalCallMoved } from './portal-call-moved.tsx'
import { template as portalCallReminder } from './portal-call-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'data-health-digest': dataHealthDigest,
  'portal-step-opened': portalStepOpened,
  'portal-call-booked': portalCallBooked,
  'portal-call-moved': portalCallMoved,
  'portal-call-reminder': portalCallReminder,
}
