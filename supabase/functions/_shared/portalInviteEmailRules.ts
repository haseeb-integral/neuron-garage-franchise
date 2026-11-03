/** Classifies signed webhook link data only; never grants access. */
export function isProspectInvite(action: string, confirmationUrl: string): boolean {
  if (action !== 'invite') return false
  try {
    const url = new URL(confirmationUrl)
    const redirect = url.searchParams.get('redirect_to')
    const destination = redirect ? new URL(redirect) : url
    return destination.pathname === '/reset-password' && destination.searchParams.get('portal') === '1'
  } catch { return false }
}
export const PROSPECT_INVITE_SUBJECT = 'Welcome to your Neuron Garage path to ownership'