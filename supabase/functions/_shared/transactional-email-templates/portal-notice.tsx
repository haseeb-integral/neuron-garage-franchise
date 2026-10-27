import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

type NoticeKind = 'step' | 'booked' | 'moved' | 'reminder'
interface Props {
  firstName?: string
  stepTitle?: string
  callTitle?: string
  dateTime?: string
  hostName?: string
  duration?: number
}
// Email clients require inline styling; these tokens mirror the portal theme.
const theme = { background: '#ffffff', navy: 'hsl(214, 64%, 20%)', yellow: 'hsl(45, 96%, 56%)', foreground: 'hsl(210, 11%, 25%)' }
const styles = {
  body: { backgroundColor: theme.background, color: theme.foreground, fontFamily: 'Arial, sans-serif', margin: 0 },
  container: { maxWidth: '600px', padding: '32px 24px 40px', margin: '0 auto' },
  brand: { color: theme.navy, fontSize: '16px', fontWeight: 700, margin: '0 0 24px' },
  heading: { color: theme.navy, fontSize: '24px', lineHeight: '32px' },
  text: { fontSize: '16px', lineHeight: '26px' },
  button: { backgroundColor: theme.yellow, color: theme.navy, padding: '14px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '16px', marginTop: '16px' },
}
const labels: Record<NoticeKind, { heading: string; button: string }> = {
  step: { heading: 'Your next Neuron Garage step is ready', button: 'View my path' },
  booked: { heading: 'Your Neuron Garage call is booked', button: 'View my call' },
  moved: { heading: 'Your Neuron Garage call time has changed', button: 'View my call' },
  reminder: { heading: 'Reminder: your Neuron Garage call is tomorrow', button: 'View my path' },
}
export const portalPreview = {
  firstName: 'Sam', stepTitle: 'Business Overview and FDD Review', callTitle: 'Business Overview Call',
  dateTime: 'Wednesday, October 28, 2026 at 3:00 PM Mountain Time', hostName: 'Sam Reed', duration: 30,
}
export function noticeComponent(kind: NoticeKind) {
  return function PortalNotice({ firstName, stepTitle, callTitle, dateTime, hostName, duration }: Props) {
    const call = callTitle || 'Neuron Garage call'
    const time = dateTime || 'the time shown in your portal'
    const withWhom = hostName ? `Your call is with ${hostName}` : 'Your host is shown in the portal'
    const length = duration ? ` and will last ${duration} minutes.` : '.'
    return <Html lang="en" dir="ltr"><Head /><Preview>{labels[kind].heading}</Preview>
      <Body style={styles.body}><Container style={styles.container}>
        <Text style={styles.brand}>Neuron Garage</Text>
        <Heading style={styles.heading}>{labels[kind].heading}</Heading>
        <Text style={styles.text}>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Text>
        {kind === 'step' ? <Text style={styles.text}>Your next step, {stepTitle || 'shown in your portal'}, is now open. Sign in to see your next tasks and available files.</Text> : <>
          <Text style={styles.text}>{kind === 'booked' ? `Your ${call} is booked for ${time}.` : kind === 'moved' ? `Your ${call} has moved to ${time}.` : `Your ${call} is tomorrow at ${time}.`} {withWhom}{length}{kind === 'reminder' ? ' Sign in to check your call details and any remaining tasks.' : ''}</Text>
        </>}
        <Button href="https://neuron-garage-franchise.lovable.app/auth" style={styles.button}>{labels[kind].button}</Button>
      </Container></Body>
    </Html>
  }
}