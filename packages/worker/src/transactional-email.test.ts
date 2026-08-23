import { describe, expect, it } from 'vitest'
import { smtpMessageId } from './transactional-email.js'

describe('SMTP transactional email provider', () => {
  it('maps the durable delivery key to a stable provider-neutral Message-ID', () => {
    expect(smtpMessageId('material-ready/83b6b183-9cc8-4bd7-a8cb-b1a4e2ad5ed3'))
      .toBe('<material-ready.83b6b183-9cc8-4bd7-a8cb-b1a4e2ad5ed3@paperbond.jjmowlab.com>')
  })
})
