/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Neuron Garage'
const DASHBOARD_URL = 'https://neuron-garage-franchise.lovable.app/observability'

type Status = 'green' | 'yellow' | 'red'

interface DomainRow {
  domain: string
  label: string
  rowCount: number
  status: Status
  note?: string
}

interface RuleRow {
  name: string
  status: Status
  violations: number
  severity?: string
}

interface DigestProps {
  recipientName?: string
  periodLabel?: string
  overallStatus?: Status
  domains?: DomainRow[]
  rules?: RuleRow[]
  openIncidents?: number
  totalSnapshots?: number
  generatedAt?: string
}

const STATUS_META: Record<Status, { color: string; bg: string; label: string }> = {
  green: { color: '#0f7a3a', bg: '#e8f6ed', label: 'Healthy' },
  yellow: { color: '#8a5a00', bg: '#fdf3d8', label: 'Watch' },
  red: { color: '#a31818', bg: '#fdecec', label: 'Action needed' },
}

const Pill = ({ status }: { status: Status }) => {
  const m = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        color: m.color,
        backgroundColor: m.bg,
      }}
    >
      {m.label}
    </span>
  )
}

const DataHealthDigestEmail = ({
  recipientName,
  periodLabel = 'the past 7 days',
  overallStatus = 'green',
  domains = [],
  rules = [],
  openIncidents = 0,
  totalSnapshots = 0,
  generatedAt,
}: DigestProps) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'
  const headline =
    overallStatus === 'green'
      ? 'All systems healthy.'
      : overallStatus === 'yellow'
      ? 'Minor issues detected.'
      : 'Action required on one or more data domains.'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${SITE_NAME} weekly data health — ${headline}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={brandKicker}>{SITE_NAME.toUpperCase()}</Text>
            <Heading as="h1" style={h1}>
              Weekly Data Health Digest
            </Heading>
            <Text style={subhead}>
              Summary of database integrity, invariants, and incidents for {periodLabel}.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Executive summary */}
          <Section>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={bodyText}>
              {headline} Below is a concise overview of the platform's data
              integrity across all monitored domains. This report is generated
              automatically every Monday at 9:00 AM ET.
            </Text>
          </Section>

          {/* KPI grid */}
          <Section style={kpiRow}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tr>
                <td style={kpiCell}>
                  <Text style={kpiLabel}>Overall</Text>
                  <div style={{ marginTop: 6 }}>
                    <Pill status={overallStatus} />
                  </div>
                </td>
                <td style={kpiCell}>
                  <Text style={kpiLabel}>Open incidents</Text>
                  <Text style={kpiValue}>{openIncidents}</Text>
                </td>
                <td style={kpiCellLast}>
                  <Text style={kpiLabel}>Snapshots taken</Text>
                  <Text style={kpiValue}>{totalSnapshots}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Domains */}
          <Section style={{ marginTop: 28 }}>
            <Heading as="h2" style={h2}>
              Data domains
            </Heading>
            <Text style={mutedText}>
              Row counts and the most recent status for each monitored table.
            </Text>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Domain</th>
                  <th style={{ ...th, textAlign: 'right' }}>Rows</th>
                  <th style={{ ...th, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {domains.length === 0 ? (
                  <tr>
                    <td style={td} colSpan={3}>
                      <Text style={mutedText}>No snapshots in this period.</Text>
                    </td>
                  </tr>
                ) : (
                  domains.map((d) => (
                    <tr key={d.domain}>
                      <td style={td}>
                        <Text style={cellPrimary}>{d.label}</Text>
                        {d.note ? <Text style={cellSecondary}>{d.note}</Text> : null}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Text style={cellPrimary}>{d.rowCount.toLocaleString()}</Text>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Pill status={d.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>

          {/* Invariants */}
          <Section style={{ marginTop: 28 }}>
            <Heading as="h2" style={h2}>
              Invariant rules
            </Heading>
            <Text style={mutedText}>
              Business rules that must always hold. A violation indicates the
              underlying data has drifted from expected shape.
            </Text>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Rule</th>
                  <th style={{ ...th, textAlign: 'right' }}>Violations</th>
                  <th style={{ ...th, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr>
                    <td style={td} colSpan={3}>
                      <Text style={mutedText}>No rules evaluated in this period.</Text>
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.name}>
                      <td style={td}>
                        <Text style={cellPrimary}>{r.name}</Text>
                        {r.severity ? (
                          <Text style={cellSecondary}>severity: {r.severity}</Text>
                        ) : null}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Text style={cellPrimary}>{r.violations}</Text>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Pill status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>

          {/* CTA */}
          <Section style={{ marginTop: 32, textAlign: 'center' }}>
            <Link href={DASHBOARD_URL} style={button}>
              Open Data Observability Dashboard
            </Link>
            <Text style={{ ...mutedText, marginTop: 12 }}>
              For incident history, sparklines, and one-off snapshots.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footerText}>
              This digest is sent automatically every Monday morning to the
              engineering and leadership team. Generated{' '}
              {generatedAt ? `at ${generatedAt}` : 'on schedule'}.
            </Text>
            <Text style={footerText}>
              — The {SITE_NAME} platform team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DataHealthDigestEmail,
  subject: (data: Record<string, any>) => {
    const status = (data?.overallStatus as Status) ?? 'green'
    const tag =
      status === 'green' ? 'All healthy' : status === 'yellow' ? 'Watch' : 'Action needed'
    return `[${SITE_NAME}] Weekly Data Health Digest — ${tag}`
  },
  displayName: 'Weekly data health digest',
  previewData: {
    recipientName: 'Brett',
    periodLabel: 'Nov 18 – Nov 24, 2026',
    overallStatus: 'yellow',
    openIncidents: 1,
    totalSnapshots: 28,
    generatedAt: 'Monday, Nov 25, 2026 · 9:00 AM ET',
    domains: [
      { domain: 'us_cities_scored', label: 'City Scores', rowCount: 794, status: 'green' },
      { domain: 'us_cities_geo', label: 'City Geo', rowCount: 31218, status: 'green' },
      { domain: 'teacher_prospects', label: 'Teacher Prospects', rowCount: 412, status: 'green' },
      { domain: 'public_schools', label: 'Public Schools', rowCount: 96241, status: 'green' },
      { domain: 'candidates', label: 'Candidates', rowCount: 6, status: 'yellow', note: 'Below expected baseline' },
    ],
    rules: [
      { name: 'no_duplicate_cities', status: 'green', violations: 0, severity: 'critical' },
      { name: 'schools_have_coords', status: 'yellow', violations: 12, severity: 'warning' },
    ],
  } satisfies DigestProps,
} satisfies TemplateEntry

// Styles — enterprise, restrained, brand-aware
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  color: '#1f2937',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '32px 28px 48px',
}

const headerSection = {
  paddingBottom: '8px',
}

const brandKicker = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1.4px',
  color: 'hsl(27, 98%, 54%)',
  margin: '0 0 8px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0f1419',
  margin: '0 0 8px',
  lineHeight: '1.25',
  letterSpacing: '-0.01em',
}

const h2 = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#0f1419',
  margin: '0 0 6px',
  letterSpacing: '-0.005em',
}

const subhead = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
}

const greetingStyle = {
  fontSize: '15px',
  color: '#0f1419',
  margin: '0 0 12px',
  fontWeight: 500,
}

const bodyText = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const mutedText = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '4px 0 12px',
}

const kpiRow = {
  marginTop: '8px',
}

const kpiCell = {
  width: '33.33%',
  padding: '14px 16px',
  border: '1px solid #e5e7eb',
  borderRight: 'none',
  borderRadius: '0',
  backgroundColor: '#fafafa',
  verticalAlign: 'top' as const,
}

const kpiCellLast = {
  ...kpiCell,
  borderRight: '1px solid #e5e7eb',
}

const kpiLabel = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  margin: '0',
}

const kpiValue = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#0f1419',
  margin: '6px 0 0',
  letterSpacing: '-0.02em',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginTop: '10px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden' as const,
}

const th = {
  textAlign: 'left' as const,
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  padding: '10px 14px',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
}

const td = {
  padding: '12px 14px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top' as const,
}

const cellPrimary = {
  fontSize: '14px',
  color: '#0f1419',
  margin: 0,
  fontWeight: 500,
}

const cellSecondary = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '2px 0 0',
}

const button = {
  display: 'inline-block',
  padding: '12px 22px',
  backgroundColor: 'hsl(27, 98%, 54%)',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '14px',
  textDecoration: 'none',
  borderRadius: '8px',
  letterSpacing: '0.01em',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '28px 0',
}

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.5',
  margin: '0 0 4px',
}
