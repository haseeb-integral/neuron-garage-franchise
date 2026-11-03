/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  prospect?: boolean
  firstName?: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  prospect,
  firstName,
}: InviteEmailProps) => prospect ? (
  <Html lang="en" dir="ltr"><Head /><Preview>Welcome to your Neuron Garage path to ownership</Preview>
    <Body style={main}><Container style={container}>
      <Heading style={h1}>Welcome to your Neuron Garage path to ownership</Heading>
      <Text style={text}>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Text>
      <Text style={text}>It was great to start the conversation with you. Your Neuron Garage portal is ready.</Text>
      <Text style={text}>Over the next few weeks, we'll get to know each other and explore what owning a Neuron Garage camp could look like. Your portal keeps your five conversations, call details, and between-call tasks in one place.</Text>
      <Text style={text}>Our first conversation is already behind us. You can still finish the Step 1 tasks before we talk again.</Text>
      <Text style={text}>Set your password to get started. We're glad you're here.</Text>
      <Button style={button} href={confirmationUrl}>Set my password</Button>
      <Text style={text}>The Neuron Garage team</Text>
    </Container></Body>
  </Html>
) : (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #000000',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
