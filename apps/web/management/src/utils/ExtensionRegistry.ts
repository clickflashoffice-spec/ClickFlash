import { EcommerceExtension } from "../types";

export const AVAILABLE_EXTENSIONS: EcommerceExtension[] = [
  {
    id: "ext_stripe",
    name: "Stripe Payments",
    status: "inactive",
    description: "Accept credit card payments directly in your gallery.",
    icon: "💳",
    config: {
      publishableKey: "",
      secretKey: "",
    },
  },
  {
    id: "ext_paypal",
    name: "PayPal Checkout",
    status: "inactive",
    description: "Allow customers to pay via PayPal.",
    icon: "🅿️",
    config: {
      clientId: "",
      clientSecret: "",
    },
  },
  {
    id: "ext_shipstation",
    name: "ShipStation",
    status: "inactive",
    description: "Sync orders to ShipStation for fulfillment.",
    icon: "📦",
    config: {
      apiKey: "",
      apiSecret: "",
    },
  },
  {
    id: "ext_google_analytics",
    name: "Google Analytics 4",
    status: "inactive",
    description: "Track visitor behavior and e-commerce events.",
    icon: "📊",
    config: {
      measurementId: "",
    },
  },
  {
    id: "ext_mailchimp",
    name: "Mailchimp",
    status: "inactive",
    description: "Sync customer emails to Mailchimp audiences.",
    icon: "📧",
    config: {
      apiKey: "",
      audienceId: "",
    },
  },
  {
    id: "ext_wholesaler",
    name: "Wholesaler Connect",
    status: "inactive",
    description: "Connect with fulfillment labs for bulk pricing.",
    icon: "🏭",
    config: {
      providerId: "",
      apiKey: "",
    },
  },
];
