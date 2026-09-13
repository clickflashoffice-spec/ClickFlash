import re

with open('apps/gallery/src/components/customer/CheckoutModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove static import of loadStripe
content = re.sub(r'import\s*\{\s*loadStripe,\s*type Appearance,\s*\}\s*from\s*\'@stripe/stripe-js\';', "import type { Appearance } from '@stripe/stripe-js';", content)

# Replace static stripePromise
deferred_stripe = """
let stripePromise: Promise<any> | null = null;
const getStripe = () => {
  if (!stripePromise && config.stripeKey) {
    stripePromise = import('@stripe/stripe-js').then((m) => m.loadStripe(config.stripeKey));
  }
  return stripePromise;
};
"""
content = re.sub(r'const stripePromise = config\.stripeKey \? loadStripe\(config\.stripeKey\) : null;', deferred_stripe, content)

# Replace usage
content = content.replace('!stripePromise', '!getStripe()')
content = content.replace('stripePromise ? (', 'getStripe() ? (')
content = content.replace('stripe={stripePromise}', 'stripe={getStripe()}')

with open('apps/gallery/src/components/customer/CheckoutModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched stripe")
