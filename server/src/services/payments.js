// ─────────────────────────────────────────────────────────────────────────────
// Payment gateway integration point.
//
// Orders already create an Invoice. To take card / PayPal payments online, implement
// `createCheckout()` for your provider and return { mode: 'redirect', url }.
// When the provider confirms payment, call `markInvoicePaid()` from the webhook
// (route: POST /api/v1/payments/webhook/:provider). Marking the invoice as paid
// automatically moves the order to "In Progress" and notifies the client.
//
// Until a gateway is connected, clients see the manual payment instructions from
// Admin → Settings → Payments (bank transfer / Payoneer / Wise etc.).
// ─────────────────────────────────────────────────────────────────────────────
import { Invoice } from '../models/index.js';

/**
 * @returns {Promise<{mode:'redirect',url:string}|{mode:'manual',instructions:string}|{mode:'unavailable'}>}
 */
export async function createCheckout({ order, invoice, settings, successUrl, cancelUrl }) { // eslint-disable-line no-unused-vars
  // 1) A payment link pasted on the invoice by the team always wins (e.g. PayPal.me / Stripe Payment Link)
  if (invoice?.paymentLink) return { mode: 'redirect', url: invoice.paymentLink };

  const provider = settings?.payments?.provider || 'manual';
  switch (provider) {
    case 'stripe':
      // TODO: const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [...], metadata: { invoiceId: invoice.id }, success_url: successUrl, cancel_url: cancelUrl });
      //       return { mode: 'redirect', url: session.url };
      break;
    case 'paypal':
      // TODO: create a PayPal order (v2/checkout/orders) and return its "approve" link
      break;
    case 'sslcommerz':
      // TODO: initiate an SSLCommerz session and return GatewayPageURL
      break;
    default:
      break;
  }
  const instructions = settings?.payments?.manualInstructions;
  return instructions ? { mode: 'manual', instructions } : { mode: 'unavailable' };
}

/** Record a successful online payment (call this from your webhook after verifying the signature). */
export async function markInvoicePaid(invoiceId, { amount, method = 'Online', reference } = {}) {
  const inv = await Invoice.findById(invoiceId);
  if (!inv) return null;
  inv.payments.push({ amount: amount ?? inv.total - inv.amountPaid, method, reference });
  await inv.save(); // triggers the order → "In Progress" sync
  return inv;
}

/** Verify + handle a provider webhook. Return true when handled. */
export async function handleWebhook(provider, req) { // eslint-disable-line no-unused-vars
  // TODO: verify the signature with your provider's SDK, then:
  //   await markInvoicePaid(req.body.metadata.invoiceId, { amount, method: provider, reference: paymentId });
  return false;
}
