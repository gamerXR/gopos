import { Platform } from 'react-native';

// SunMi printer service
let SunmiPrinter: any = null;

// Temporarily disabled for APK build - library has compatibility issues
// To re-enable: uncomment below and run yarn add react-native-sunmi-inner-printer
// if (Platform.OS === 'android') {
//   try {
//     SunmiPrinter = require('react-native-sunmi-inner-printer').default;
//   } catch (error) {
//     console.log('SunMi printer module not available:', error);
//   }
// }

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  modifiers?: Array<{
    name: string;
    cost: number;
  }>;
}

export interface ReceiptData {
  orderNumber: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  salesPerson: string;
  timestamp: string;
  companyName?: string;
  companyAddress?: string;
}

class SunmiPrinterService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('SunMi printer only available on Android');
      return false;
    }

    if (!SunmiPrinter) {
      console.log('SunMi printer module not available');
      return false;
    }

    try {
      await SunmiPrinter.printerInit();
      this.isInitialized = true;
      console.log('SunMi printer initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SunMi printer:', error);
      return false;
    }
  }

  async checkPrinterStatus(): Promise<string> {
    if (!SunmiPrinter) return 'unavailable';
    
    try {
      const status = await SunmiPrinter.getPrinterStatus();
      return status;
    } catch (error) {
      console.error('Failed to get printer status:', error);
      return 'error';
    }
  }

  async printReceipt(data: ReceiptData): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (!SunmiPrinter) {
      console.error('SunMi printer not available');
      return false;
    }

    try {
      // Set alignment and font size
      await SunmiPrinter.setAlignment(1); // Center
      await SunmiPrinter.setFontSize(30);
      
      // Print company header
      if (data.companyName) {
        await SunmiPrinter.printText(data.companyName + '\n');
      }
      if (data.companyAddress) {
        await SunmiPrinter.setFontSize(24);
        await SunmiPrinter.printText(data.companyAddress + '\n');
      }
      
      await SunmiPrinter.printText('================\n');
      await SunmiPrinter.setFontSize(26);
      await SunmiPrinter.printText(`Order #${data.orderNumber}\n`);
      await SunmiPrinter.printText(`${data.timestamp}\n`);
      await SunmiPrinter.printText('================\n\n');

      // Print items (left aligned)
      await SunmiPrinter.setAlignment(0); // Left
      await SunmiPrinter.setFontSize(24);
      
      for (const item of data.items) {
        // Item name and quantity
        const itemLine = `${item.name} x${item.quantity}`;
        await SunmiPrinter.printText(itemLine + '\n');
        
        // Item price on same line
        const itemTotal = item.price * item.quantity;
        const priceLine = `  $${item.price.toFixed(2)} ea = $${itemTotal.toFixed(2)}`;
        await SunmiPrinter.printText(priceLine + '\n');
        
        // Print modifiers if any
        if (item.modifiers && item.modifiers.length > 0) {
          for (const mod of item.modifiers) {
            const modLine = `  + ${mod.name} (+$${mod.cost.toFixed(2)})`;
            await SunmiPrinter.printText(modLine + '\n');
          }
        }
        
        await SunmiPrinter.printText('\n');
      }

      // Print totals
      await SunmiPrinter.printText('--------------------------------\n');
      await SunmiPrinter.setFontSize(26);
      
      const subtotalLine = this.formatLine('Subtotal:', `$${data.subtotal.toFixed(2)}`);
      await SunmiPrinter.printText(subtotalLine + '\n');
      
      await SunmiPrinter.setFontSize(28);
      await SunmiPrinter.printText('================================\n');
      const totalLine = this.formatLine('TOTAL:', `$${data.total.toFixed(2)}`);
      await SunmiPrinter.printText(totalLine + '\n');
      await SunmiPrinter.printText('================================\n\n');

      // Payment info
      await SunmiPrinter.setFontSize(24);
      await SunmiPrinter.printText(`Payment: ${data.paymentMethod}\n`);
      await SunmiPrinter.printText(`Served by: ${data.salesPerson}\n\n`);

      // Footer
      await SunmiPrinter.setAlignment(1); // Center
      await SunmiPrinter.printText('Thank you!\n');
      await SunmiPrinter.printText('Visit us again\n\n');

      // Feed paper and cut
      await SunmiPrinter.lineWrap(3);
      
      console.log('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  async printSalesReport(reportData: any): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (!SunmiPrinter) return false;

    try {
      // Header
      await SunmiPrinter.setAlignment(1); // Center
      await SunmiPrinter.setFontSize(30);
      await SunmiPrinter.printText('SALES REPORT\n');
      await SunmiPrinter.setFontSize(24);
      await SunmiPrinter.printText(`${reportData.date || 'Today'}\n`);
      await SunmiPrinter.printText('================\n\n');

      // Summary
      await SunmiPrinter.setAlignment(0); // Left
      await SunmiPrinter.setFontSize(26);
      
      const summaryLines = [
        this.formatLine('Total Orders:', reportData.totalOrders?.toString() || '0'),
        this.formatLine('Total Revenue:', `$${reportData.totalRevenue?.toFixed(2) || '0.00'}`),
        this.formatLine('Items Sold:', reportData.totalItems?.toString() || '0'),
      ];

      for (const line of summaryLines) {
        await SunmiPrinter.printText(line + '\n');
      }

      // Payment breakdown
      if (reportData.paymentBreakdown) {
        await SunmiPrinter.printText('\n--- Payment Methods ---\n');
        for (const [method, amount] of Object.entries(reportData.paymentBreakdown)) {
          const line = this.formatLine(method + ':', `$${(amount as number).toFixed(2)}`);
          await SunmiPrinter.printText(line + '\n');
        }
      }

      // Footer
      await SunmiPrinter.printText('\n');
      await SunmiPrinter.setAlignment(1);
      await SunmiPrinter.printText(`Generated: ${new Date().toLocaleString()}\n`);
      
      await SunmiPrinter.lineWrap(3);
      
      return true;
    } catch (error) {
      console.error('Failed to print sales report:', error);
      return false;
    }
  }

  async testPrint(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (!SunmiPrinter) return false;

    try {
      await SunmiPrinter.setAlignment(1);
      await SunmiPrinter.setFontSize(28);
      await SunmiPrinter.printText('SunMi Printer Test\n');
      await SunmiPrinter.printText('================\n');
      await SunmiPrinter.setFontSize(24);
      await SunmiPrinter.printText('Printer is working!\n');
      await SunmiPrinter.printText(`Time: ${new Date().toLocaleString()}\n\n`);
      await SunmiPrinter.lineWrap(2);
      return true;
    } catch (error) {
      console.error('Test print failed:', error);
      return false;
    }
  }

  // Helper to format lines with proper spacing (for 58mm paper ~32 chars)
  private formatLine(label: string, value: string, width: number = 32): string {
    const totalLength = label.length + value.length;
    const spaces = width - totalLength;
    const padding = spaces > 0 ? ' '.repeat(spaces) : ' ';
    return label + padding + value;
  }

  async openCashDrawer(): Promise<boolean> {
    if (!SunmiPrinter) return false;
    
    try {
      await SunmiPrinter.openDrawer();
      return true;
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }
}

export default new SunmiPrinterService();
