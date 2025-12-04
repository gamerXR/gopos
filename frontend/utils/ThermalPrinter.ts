import { Platform } from 'react-native';
import USBThermalPrinter from 'react-native-usb-thermal-printer';

export interface PrinterConfig {
  paperWidth: number; // in mm (58mm or 80mm)
  encoding: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: 58, // 58mm thermal paper
  encoding: 'GBK',
};

/**
 * Initialize USB Thermal Printer
 */
export const initPrinter = async (): Promise<boolean> => {
  try {
    if (Platform.OS !== 'android') {
      console.warn('USB Thermal Printer only works on Android');
      return false;
    }

    await USBThermalPrinter.init();
    return true;
  } catch (error) {
    console.error('Failed to initialize printer:', error);
    return false;
  }
};

/**
 * Get list of connected USB printers
 */
export const getConnectedPrinters = async (): Promise<any[]> => {
  try {
    const printers = await USBThermalPrinter.getDeviceList();
    return printers || [];
  } catch (error) {
    console.error('Failed to get printers:', error);
    return [];
  }
};

/**
 * Connect to USB printer
 */
export const connectPrinter = async (vendorId: number, productId: number): Promise<boolean> => {
  try {
    await USBThermalPrinter.connect(vendorId, productId);
    return true;
  } catch (error) {
    console.error('Failed to connect printer:', error);
    return false;
  }
};

/**
 * Print receipt for order
 */
export const printReceipt = async (orderData: any, companyInfo: any): Promise<boolean> => {
  try {
    const {
      receipt_no,
      items,
      total,
      discount = 0,
      payment_method,
      created_at,
    } = orderData;

    const {
      company_name = 'Restaurant',
      address = '',
      phone = '',
    } = companyInfo;

    // Center align and format
    const CENTER = USBThermalPrinter.ALIGN.CENTER;
    const LEFT = USBThermalPrinter.ALIGN.LEFT;
    const BOLD_ON = '\x1b\x45\x01';
    const BOLD_OFF = '\x1b\x45\x00';

    // Header
    await USBThermalPrinter.setAlign(CENTER);
    await USBThermalPrinter.printText(`${BOLD_ON}${company_name}${BOLD_OFF}\n`);
    if (address) await USBThermalPrinter.printText(`${address}\n`);
    if (phone) await USBThermalPrinter.printText(`Tel: ${phone}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');

    // Receipt info
    await USBThermalPrinter.setAlign(LEFT);
    await USBThermalPrinter.printText(`Receipt #: ${receipt_no}\n`);
    await USBThermalPrinter.printText(`Date: ${new Date(created_at).toLocaleString()}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');

    // Items
    for (const item of items) {
      const itemName = item.name;
      const qty = item.quantity;
      const price = item.price;
      const itemTotal = (qty * price).toFixed(2);

      await USBThermalPrinter.printText(`${itemName}\n`);
      await USBThermalPrinter.printText(`  ${qty} x $${price.toFixed(2)}`);
      await USBThermalPrinter.printText(`$${itemTotal}\n`.padStart(32 - itemName.length));

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          await USBThermalPrinter.printText(`  + ${mod.name} ($${mod.cost.toFixed(2)})\n`);
        }
      }
    }

    await USBThermalPrinter.printText('--------------------------------\n');

    // Totals
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemTotal = item.price * item.quantity;
      const modTotal = (item.modifiers || []).reduce((m: number, mod: any) => m + mod.cost, 0);
      return sum + itemTotal + modTotal;
    }, 0);

    await USBThermalPrinter.printText(`Subtotal:           $${subtotal.toFixed(2)}\n`);
    if (discount > 0) {
      await USBThermalPrinter.printText(`Discount:          -$${discount.toFixed(2)}\n`);
    }
    await USBThermalPrinter.printText(`${BOLD_ON}Total:              $${total.toFixed(2)}${BOLD_OFF}\n`);
    await USBThermalPrinter.printText(`Payment: ${payment_method.toUpperCase()}\n`);

    await USBThermalPrinter.printText('--------------------------------\n');
    await USBThermalPrinter.setAlign(CENTER);
    await USBThermalPrinter.printText('Thank You!\n');
    await USBThermalPrinter.printText('Please Come Again\n\n\n');

    // Feed paper
    await USBThermalPrinter.printText('\n\n');

    return true;
  } catch (error) {
    console.error('Failed to print receipt:', error);
    return false;
  }
};

/**
 * Print Day Closing Report
 */
export const printDayClosingReport = async (reportData: any, companyInfo: any): Promise<boolean> => {
  try {
    const {
      total_sales,
      total_orders,
      cash_sales,
      qr_sales,
      total_discount,
      return_sales = 0,
      start_date,
      end_date,
    } = reportData;

    const { company_name = 'Restaurant' } = companyInfo;

    const CENTER = USBThermalPrinter.ALIGN.CENTER;
    const LEFT = USBThermalPrinter.ALIGN.LEFT;
    const BOLD_ON = '\x1b\x45\x01';
    const BOLD_OFF = '\x1b\x45\x00';

    // Header
    await USBThermalPrinter.setAlign(CENTER);
    await USBThermalPrinter.printText(`${BOLD_ON}${company_name}${BOLD_OFF}\n`);
    await USBThermalPrinter.printText(`${BOLD_ON}DAY CLOSING REPORT${BOLD_OFF}\n`);
    await USBThermalPrinter.printText('================================\n');

    // Date range
    await USBThermalPrinter.setAlign(LEFT);
    await USBThermalPrinter.printText(`Date: ${new Date(start_date || Date.now()).toLocaleDateString()}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');

    // Sales Summary
    await USBThermalPrinter.printText(`${BOLD_ON}SALES SUMMARY${BOLD_OFF}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');
    await USBThermalPrinter.printText(`Gross Sales:        $${total_sales.toFixed(2)}\n`);
    
    if (return_sales > 0) {
      await USBThermalPrinter.printText(`Return Sales:      -$${return_sales.toFixed(2)}\n`);
      const netSales = total_sales - return_sales;
      await USBThermalPrinter.printText('--------------------------------\n');
      await USBThermalPrinter.printText(`${BOLD_ON}Net Sales:          $${netSales.toFixed(2)}${BOLD_OFF}\n`);
    }
    
    await USBThermalPrinter.printText('--------------------------------\n');
    await USBThermalPrinter.printText(`Total Orders:       ${total_orders}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');

    // Payment Breakdown
    await USBThermalPrinter.printText(`${BOLD_ON}PAYMENT BREAKDOWN${BOLD_OFF}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');
    await USBThermalPrinter.printText(`Cash Sales:         $${cash_sales.toFixed(2)}\n`);
    await USBThermalPrinter.printText(`QR Sales:           $${qr_sales.toFixed(2)}\n`);
    await USBThermalPrinter.printText('--------------------------------\n');
    await USBThermalPrinter.printText(`Total Discount:     $${total_discount.toFixed(2)}\n`);
    await USBThermalPrinter.printText('================================\n');

    // Footer
    await USBThermalPrinter.setAlign(CENTER);
    await USBThermalPrinter.printText(`Printed: ${new Date().toLocaleString()}\n`);
    await USBThermalPrinter.printText('\n\n\n');

    return true;
  } catch (error) {
    console.error('Failed to print day closing report:', error);
    return false;
  }
};

/**
 * Close printer connection
 */
export const disconnectPrinter = async (): Promise<void> => {
  try {
    await USBThermalPrinter.close();
  } catch (error) {
    console.error('Failed to disconnect printer:', error);
  }
};
