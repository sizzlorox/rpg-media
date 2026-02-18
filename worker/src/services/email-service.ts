// EmailService: wraps Resend HTTP API for transactional emails
// Falls back to console.log if RESEND_API_KEY is not set (safe for local dev)
// Aesthetic: dark terminal / MUD style HTML emails

interface SendParams {
  to: string
  subject: string
  html: string
}

export class EmailService {
  constructor(
    private apiKey: string | undefined,
    private fromEmail: string
  ) {}

  async send(params: SendParams): Promise<void> {
    if (!this.apiKey) {
      console.log(`[EmailService] RESEND_API_KEY not set — would send email:`)
      console.log(`  To: ${params.to}`)
      console.log(`  Subject: ${params.subject}`)
      console.log(`  Body (HTML stripped): ${params.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}`)
      return
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[EmailService] Resend API error ${response.status}: ${text}`)
      throw new Error(`Email delivery failed: ${response.status}`)
    }
  }

  buildVerificationEmail(username: string, verifyUrl: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify Your Email - Social Forge</title>
  <style>
    body { background-color: #000000; color: #00ff00; font-family: 'Courier New', Courier, monospace; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #00ff00; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; color: #00ff00; }
    .box { border: 1px solid #00ff00; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background-color: #00ff00; color: #000000; text-decoration: none; padding: 10px 20px; font-family: 'Courier New', Courier, monospace; font-weight: bold; margin: 10px 0; }
    a { color: #00ccff; }
    .note { color: #888888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <pre>╔══════════════════════════════════════╗
║      SOCIAL FORGE - SYSTEM MSG       ║
╚══════════════════════════════════════╝</pre>
    </div>
    <div class="box">
      <p>$ cat /var/mail/verification.txt</p>
      <p>[VERIFICATION TOKEN RECEIVED]</p>
      <p>User: @${username}</p>
      <p>Action required: verify your email address</p>
    </div>
    <p>Click the link below to verify your email and start posting:</p>
    <p><a class="btn" href="${verifyUrl}">VERIFY EMAIL</a></p>
    <p>Or copy this URL into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <div class="box">
      <p>&gt; Expires in 24 hours.</p>
      <p>&gt; If you did not register, ignore this message.</p>
    </div>
    <p class="note">Social Forge — Level up through engagement</p>
  </div>
</body>
</html>`
  }

  buildPasswordResetEmail(username: string, resetUrl: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Password Reset - Social Forge</title>
  <style>
    body { background-color: #000000; color: #00ff00; font-family: 'Courier New', Courier, monospace; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #00ff00; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; color: #00ff00; }
    .box { border: 1px solid #00ff00; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background-color: #00ff00; color: #000000; text-decoration: none; padding: 10px 20px; font-family: 'Courier New', Courier, monospace; font-weight: bold; margin: 10px 0; }
    a { color: #00ccff; }
    .warn { color: #ffaa00; }
    .note { color: #888888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <pre>╔══════════════════════════════════════╗
║      SOCIAL FORGE - SYSTEM MSG       ║
╚══════════════════════════════════════╝</pre>
    </div>
    <div class="box">
      <p>$ cat /var/mail/password_reset.txt</p>
      <p>[PASSWORD RESET REQUEST RECEIVED]</p>
      <p>User: @${username}</p>
    </div>
    <p>Click the link below to reset your password:</p>
    <p><a class="btn" href="${resetUrl}">RESET PASSWORD</a></p>
    <p>Or copy this URL into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <div class="box">
      <p>&gt; Expires in 1 hour.</p>
      <p class="warn">&gt; If you did not request this, secure your account immediately.</p>
      <p>&gt; This link can only be used once.</p>
    </div>
    <p class="note">Social Forge — Level up through engagement</p>
  </div>
</body>
</html>`
  }
}
