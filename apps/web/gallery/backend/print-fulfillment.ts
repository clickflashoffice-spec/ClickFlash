import { createLogger } from '@clickflash/logger';

const logger = createLogger({ serviceName: 'print-fulfillment' });

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
  printSize?: string;
  type: 'digital' | 'print';
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface PrintOrderRequest {
  orderId: string;
  customerEmail: string;
  shipping: ShippingAddress;
  items: OrderItem[];
}

export class PrintFulfillmentService {
  /**
   * Places an order with a global dropshipper (e.g. Prodigi, Gelato)
   * This is a mock implementation.
   */
  static async placeOrder(request: PrintOrderRequest): Promise<boolean> {
    logger.info(`Initiating print fulfillment for order ${request.orderId} to ${request.shipping.country}`);
    
    try {
      const printItems = request.items.filter(item => item.type === 'print');
      
      if (printItems.length === 0) {
        logger.info(`No print items in order ${request.orderId}, skipping fulfillment.`);
        return false;
      }

      // Simulate API call to Print API (e.g., Prodigi)
      logger.info(`Sending ${printItems.length} items to print lab API...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info(`Print order successfully placed with lab for order ${request.orderId}`);
      
      // In a real scenario, we'd save the Lab's order ID to our database
      return true;
    } catch (error) {
      logger.error(`Failed to place print order for ${request.orderId}`, error instanceof Error ? error : { error: String(error) });
      throw new Error('Print fulfillment failed');
    }
  }
}
