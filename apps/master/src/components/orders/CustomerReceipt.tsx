import { logger } from '@clickflash/logger';
import React from "react";
import { Order } from "../../types.ts";
import useSystemSetting from "../../hooks/useSystemSetting.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import QRCode from "qrcode";

interface CustomerReceiptProps {
  order: Order;
}

const DEFAULT_SETTINGS = {
  logoUrl: "/logo.png",
  companyName: "Star Master Photography",
  addressLine1: "123 Hotel Avenue",
  addressLine2: "Sousse, Tunisia",
  taxName: "VAT",
  taxRate: 19,
  registrationNumber: "RC: 12345678",
  thankYouMessage:
    "Thank you for your purchase! We hope you enjoy your photos.",
  loginInstructions:
    "To access your digital gallery, please visit our website and log in using the credentials below.",
  galleryUrl: "https://starmaster.photo/gallery",
  footerText: "For support, contact us at photos@example.com",
};

const CustomerReceipt: React.FC<CustomerReceiptProps> = ({ order }) => {
  const [settings, , loading] = useSystemSetting(
    "receipt_config",
    DEFAULT_SETTINGS,
  );
  const { formatCurrency } = useCurrency();
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    QRCode.toDataURL(order.id, { margin: 1, width: 128 })
      .then((url: string) => setQrCodeDataUrl(url))
      .catch((err: any) => logger.error("QR Code generation failed", err));
  }, [order.id]);

  if (loading)
    return (
      <div className="p-8 text-center text-zinc-500">Generating receipt...</div>
    );

  // Calculate Tax
  const taxRateDecimal = (settings.taxRate || 0) / 100;
  const netAmount = order.total / (1 + taxRateDecimal);
  const taxAmount = order.total - netAmount;

  // Real QR Code for hardware scanners
  const renderBarcode = () => {
    return (
      <div className="flex justify-center opacity-90">
        {qrCodeDataUrl ? (
          <img src={qrCodeDataUrl} alt={`QR Code for ${order.id}`} className="w-20 h-20" />
        ) : (
          <div className="w-20 h-20 bg-gray-200 animate-pulse rounded"></div>
        )}
      </div>
    );
  };

  return (
    <div className="printable-area p-8 bg-white text-black font-sans max-w-2xl mx-auto my-8 border rounded-lg shadow-lg print:p-0 print:border-none print:shadow-none print:my-0 print:w-[80mm] print:mx-auto print:text-xs">
      <header className="text-center pb-6 border-b-2 border-dashed">
        <img
          src={settings.logoUrl}
          alt="Company Logo"
          className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
        />
        <h1 className="text-2xl print:text-base font-bold uppercase tracking-wide">
          {settings.companyName}
        </h1>
        <p className="text-sm text-gray-600">{settings.addressLine1}</p>
        <p className="text-sm text-gray-600">{settings.addressLine2}</p>
        {settings.registrationNumber && (
          <p className="text-xs text-gray-500 mt-1">
            {settings.registrationNumber}
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xl print:text-sm font-mono font-bold">Order #{order.id}</p>
          <div className="mt-2 flex justify-center">
            {renderBarcode()}
          </div>
        </div>
      </header>

      <section className="my-6 flex justify-between text-sm">
        <div>
          <p>
            <strong>Date:</strong> {new Date(order.date).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p>
            <strong>Client:</strong> {order.clientName}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-gray-300">
            <tr>
              <th className="text-left py-2">Item</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-dashed border-gray-200">
                <td className="py-2">{item.name}</td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">
                  {formatCurrency(item.price)}
                </td>
                <td className="text-right py-2">
                  {formatCurrency(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 flex justify-end">
        <div className="w-48 text-sm">
          <div className="flex justify-between py-1">
            <span>Net Total:</span>
            <span>{formatCurrency(netAmount)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-300">
            <span>
              {settings.taxName} ({settings.taxRate}%):
            </span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between py-2 text-xl print:text-sm font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </section>

      <section className="my-8">
        <h2 className="text-lg font-bold text-center mb-2 border-b pb-2">
          Online Gallery Access
        </h2>
        <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 text-center">
          <p className="text-sm text-gray-700 mb-3">
            {settings.loginInstructions}
          </p>

          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mb-3">
            <div className="text-right font-semibold text-gray-600">URL:</div>
            <div className="font-mono text-xs break-all">
              {settings.galleryUrl}
            </div>

            <div className="text-right font-semibold text-gray-600">PIN:</div>
            <div className="font-bold font-mono text-2xl print:text-base tracking-widest text-cyan-600 print:text-black">
              {order.access_pin || "----"}
            </div>

            <div className="text-right font-semibold text-gray-600">
              Order ID:
            </div>
            <div className="font-bold font-mono">{order.id}</div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Scan QR code (on kiosk) or use the link above.
          </div>
        </div>
      </section>

      <footer className="text-center pt-6 border-t-2 border-dashed">
        <p className="font-semibold text-gray-700">
          {settings.thankYouMessage}
        </p>
        <p className="text-xs text-gray-500 mt-1">{settings.footerText}</p>
      </footer>
    </div>
  );
};

export default CustomerReceipt;
