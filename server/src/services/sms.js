// SMS sending for phone verification codes.
// Works out of the box with Twilio (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM in .env).
// Using a Bangladeshi gateway (SSL Wireless, BulkSMSBD, Alpha SMS…)? Set SMS_WEBHOOK_URL to its HTTP API
// with {to} and {message} placeholders, e.g.  https://api.example.com/send?api_key=XXX&to={to}&msg={message}
// Without any configuration the SMS is printed to the server console (development).
export async function sendSms(to, message) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_FROM: from, SMS_WEBHOOK_URL: hook } = process.env;
  try {
    if (sid && tok && from) {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      });
      if (!r.ok) throw new Error(`Twilio ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return true;
    }
    if (hook) {
      const url = hook.replace('{to}', encodeURIComponent(to)).replace('{message}', encodeURIComponent(message));
      const r = await fetch(url);
      if (!r.ok) throw new Error(`SMS gateway ${r.status}`);
      return true;
    }
    console.log(`[sms:dev] to=${to} message="${message}" (SMS provider not configured — not sent)`);
    return true;
  } catch (e) {
    console.error('[sms] FAILED', e.message);
    return false;
  }
}

export const smsConfigured = () => !!((process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) || process.env.SMS_WEBHOOK_URL);
