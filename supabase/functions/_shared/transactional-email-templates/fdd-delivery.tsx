import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const theme = { background: '#ffffff', navy: '#0A2240', red: '#FF4438' }
function FddDelivery({ firstName, issuanceDate, fileName, downloadUrl }: { firstName?: string; issuanceDate?: string; fileName?: string; downloadUrl?: string }) {
  return <Html lang="en"><Head /><Preview>Your Neuron Garage FDD is ready to review</Preview>
    <Body style={{ backgroundColor: theme.background, color: theme.navy, fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ maxWidth: '600px', padding: '32px 24px' }}>
        <Text>Neuron Garage</Text><Heading>Your Franchise Disclosure Document</Heading>
        <Text>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Text>
        <Text>Here is your Neuron Garage Franchise Disclosure Document (FDD), issued {issuanceDate}. Please download and review the full document and its exhibits.</Text>
        <Text>{fileName}</Text>
        <Button href={downloadUrl} style={{ backgroundColor: theme.red, color: theme.background, padding: '14px 24px', borderRadius: '6px' }}>Download your FDD</Button>
        <Text>This private link expires in 7 days. You can also sign in to your portal to download the FDD and sign your Item 23 receipt.</Text>
        <Button href="https://neuron-garage-franchise.lovable.app/portal/sign-in">Sign in to your portal</Button>
        <Text>If you have questions, please reply to your Neuron Garage contact.</Text>
      </Container>
    </Body>
  </Html>
}
export const template = { component: FddDelivery, subject: 'Your Neuron Garage Franchise Disclosure Document', displayName: 'FDD delivery', previewData: { firstName: 'Sam', issuanceDate: 'March 1, 2026', fileName: '2026 Neuron Garage FDD with Exhibits.pdf', downloadUrl: 'https://neuron-garage-franchise.lovable.app/portal' } } satisfies TemplateEntry