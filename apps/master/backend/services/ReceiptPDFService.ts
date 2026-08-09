/**
 * ReceiptPDFService — generates a branded PDF receipt for gallery orders.
 *
 * Uses pdfmake (server-side PdfPrinter) with the bundled Roboto font.
 * The generated PDF is written to DATA_DIR/receipts/<orderId>.pdf and returned
 * as a base64 string for use as a Resend email attachment.
 *
 * Note: @types/pdfmake targets the browser bundle; we use `require()` here
 * to instantiate the server-side PdfPrinter without hitting the namespace
 * type mismatch.
 *
 * Phase 1-D of the ClickFlash Master rebuild plan.
 */

import fs from "fs";
import path from "path";
import { Logger } from '../utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require("pdfmake") as {
  new (fontDescriptors: Record<string, {
    normal: string; bold: string; italics: string; bolditalics: string;
  }>): {
    createPdfKitDocument(docDef: Record<string, unknown>): NodeJS.ReadableStream & {
      end(): void;
    };
  };
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptData {
  orderId: string;
  displayId: string;
  customerName: string;
  customerEmail: string;
  albumName: string;
  lineItems: ReceiptLineItem[];
  totalAmount: number;
  currency: string;
  paidAt: string;
}

// ─── Font configuration ───────────────────────────────────────────────────────

const FONTS_DIR = path.resolve(
  __dirname,
  "../../node_modules/pdfmake/build/fonts/Roboto",
);

const PRINTER_FONTS = {
  Roboto: {
    normal:      path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bold:        path.join(FONTS_DIR, "Roboto-Medium.ttf"),
    italics:     path.join(FONTS_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "Roboto-MediumItalic.ttf"),
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Document definition ─────────────────────────────────────────────────────

function buildDoc(data: ReceiptData): Record<string, unknown> {
  const itemRows = data.lineItems.map((item) => [
    { text: item.description, fontSize: 10, color: "#1e293b", margin: [6, 5, 6, 5] as [number,number,number,number] },
    { text: String(item.quantity), fontSize: 10, alignment: "center", margin: [6, 5, 6, 5] as [number,number,number,number] },
    { text: fmt(item.unitPrice, data.currency), fontSize: 10, alignment: "right", margin: [6, 5, 6, 5] as [number,number,number,number] },
    { text: fmt(item.quantity * item.unitPrice, data.currency), fontSize: 10, alignment: "right", margin: [6, 5, 6, 5] as [number,number,number,number] },
  ]);

  const tableBody = [
    // Header row
    [
      { text: "Description", bold: true, color: "#ffffff", fillColor: "#0f172a", margin: [6, 6, 6, 6] as [number,number,number,number] },
      { text: "Qty",         bold: true, color: "#ffffff", fillColor: "#0f172a", alignment: "center", margin: [6, 6, 6, 6] as [number,number,number,number] },
      { text: "Unit Price",  bold: true, color: "#ffffff", fillColor: "#0f172a", alignment: "right", margin: [6, 6, 6, 6] as [number,number,number,number] },
      { text: "Subtotal",    bold: true, color: "#ffffff", fillColor: "#0f172a", alignment: "right", margin: [6, 6, 6, 6] as [number,number,number,number] },
    ],
    ...itemRows,
    // Total row
    [
      { text: "Total", bold: true, colSpan: 3, color: "#0f172a", margin: [6, 8, 6, 8] as [number,number,number,number] },
      {},
      {},
      { text: fmt(data.totalAmount, data.currency), bold: true, alignment: "right", color: "#0f172a", margin: [6, 8, 6, 8] as [number,number,number,number] },
    ],
  ];

  return {
    pageSize: "A4",
    pageMargins: [50, 60, 50, 60] as [number,number,number,number],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#1e293b" },

    content: [
      // Header: branding + RECEIPT label
      {
        columns: [
          {
            stack: [
              { text: "ClickFlash", fontSize: 22, bold: true, color: "#0f172a", margin: [0, 0, 0, 4] as [number,number,number,number] },
              { text: "Professional Event Photography", fontSize: 11, color: "#64748b" },
            ],
          },
          {
            stack: [
              { text: "RECEIPT", fontSize: 18, bold: true, color: "#0ea5e9", alignment: "right" },
              { text: `#${data.displayId}`, fontSize: 11, color: "#64748b", alignment: "right" },
            ],
            width: "auto",
          },
        ],
        margin: [0, 0, 0, 8] as [number,number,number,number],
      },
      // Divider
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }], margin: [0, 0, 0, 20] as [number,number,number,number] },

      // Customer + order info
      {
        columns: [
          {
            stack: [
              { text: "BILLED TO", fontSize: 9, bold: true, color: "#475569", margin: [0, 0, 0, 4] as [number,number,number,number] },
              { text: data.customerName, bold: true },
              { text: data.customerEmail, fontSize: 9, color: "#64748b" },
            ],
            width: "50%",
          },
          {
            stack: [
              { text: "ORDER DETAILS", fontSize: 9, bold: true, color: "#475569", margin: [0, 0, 0, 4] as [number,number,number,number] },
              { columns: [{ text: "Order ID:", width: 70, fontSize: 9, color: "#64748b" }, { text: data.displayId }] },
              { columns: [{ text: "Album:", width: 70, fontSize: 9, color: "#64748b" }, { text: data.albumName }] },
              { columns: [{ text: "Paid on:", width: 70, fontSize: 9, color: "#64748b" }, { text: fmtDate(data.paidAt) }] },
            ],
            width: "50%",
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 20] as [number,number,number,number],
      },

      // Line items
      { text: "ITEMS PURCHASED", fontSize: 9, bold: true, color: "#475569", margin: [0, 0, 0, 6] as [number,number,number,number] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 40, 80, 80],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? 0 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e2e8f0",
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? "#0f172a" : rowIndex % 2 === 0 ? "#f8fafc" : null,
        },
        margin: [0, 0, 0, 24] as [number,number,number,number],
      },

      // Closing note
      {
        text: "Your high-resolution photos are now unlocked in your digital gallery. Thank you for your purchase!",
        fontSize: 10,
        color: "#475569",
        italics: true,
      },
    ],

    footer: () => ({
      text: `ClickFlash Professional Photography  •  Receipt generated ${new Date().toLocaleDateString("en-GB")}`,
      fontSize: 8,
      color: "#94a3b8",
      alignment: "center",
      margin: [50, 0, 50, 0] as [number,number,number,number],
    }),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ReceiptPDFService {
  private readonly receiptsDir: string;
  private readonly printer: InstanceType<typeof PdfPrinter>;

  constructor(
    dataDir: string,
    private readonly logger: Logger,
  ) {
    this.receiptsDir = path.join(dataDir, "receipts");
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
    this.printer = new PdfPrinter(PRINTER_FONTS);
  }

  /**
   * Generate a PDF receipt, write it to disk, and return the file path + base64.
   */
  async generate(data: ReceiptData): Promise<{ filePath: string; base64: string }> {
    const filePath = path.join(this.receiptsDir, `${data.orderId}.pdf`);
    const doc = this.printer.createPdfKitDocument(buildDoc(data));

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      (doc as unknown as NodeJS.ReadableStream).on("data", (chunk: Buffer) => chunks.push(chunk));
      (doc as unknown as NodeJS.ReadableStream).on("end", () => {
        const buffer = Buffer.concat(chunks);
        try {
          fs.writeFileSync(filePath, buffer);
          this.logger.info("[ReceiptPDFService] PDF saved", { filePath, bytes: buffer.length });
          resolve({ filePath, base64: buffer.toString("base64") });
        } catch (writeErr: any) {
          reject(new Error(`Failed to write PDF: ${writeErr.message}`));
        }
      });
      (doc as unknown as NodeJS.ReadableStream).on("error", (err: Error) => reject(err));
      doc.end();
    });
  }

  /** Return the path to a previously generated receipt, or null if it doesn't exist. */
  getExistingPath(orderId: string): string | null {
    const filePath = path.join(this.receiptsDir, `${orderId}.pdf`);
    return fs.existsSync(filePath) ? filePath : null;
  }
}
