        postalCode?: string;
      };
      presetTaxCode?: string;
    }
  ): Promise<Stripe.Tax.Settings> {
    try {
      const settings = await this.stripe.tax.settings.update({
        defaults: {
          tax_code: config.presetTaxCode || PRODUCT_TAX_CODES.SOFTWARE_PLATFORMS
        },
        head_office: {
          address: {
            country: config.headOffice.country,
            state: config.headOffice.state,
            city: config.headOffice.city,
            postal_code: config.headOffice.postalCode,
            line1: '123 Business St' // This should be updated with actual address
          }
        }
      }, { stripeAccount: accountId });

      return settings;
    } catch (error) {
      console.error('Failed to configure connected account tax:', error);
      throw new Error('Connected account tax configuration failed');
    }
  }

  /**
   * Calculate tax for a marketplace transaction
   */
  async calculateTax(params: {
    amount: number;
    currency: string;
    customerAddress: {
      country: string;
      state?: string;
      city?: string;
      postalCode?: string;
    };
    productTaxCode?: string;
    connectedAccountId?: string;
  }): Promise<Stripe.Tax.Calculation> {
    const { amount, currency, customerAddress, productTaxCode, connectedAccountId } = params;

    try {
      const calculation = await this.stripe.tax.calculations.create({
        currency,
        customer_details: {
          address: {
            country: customerAddress.country,
            state: customerAddress.state,
            city: customerAddress.city,
            postal_code: customerAddress.postalCode,
          },
          address_source: 'billing',
        },
        line_items: [{
          amount,
          reference: 'platform_transaction',
          tax_code: productTaxCode || PRODUCT_TAX_CODES.SOFTWARE_PLATFORMS,
        }],
        expand: ['line_items.data.tax_breakdown'],
      }, connectedAccountId ? { stripeAccount: connectedAccountId } : undefined);

      return calculation;
    } catch (error) {
      console.error('Tax calculation failed:', error);
      throw new Error('Tax calculation failed');
    }
  }

  /**
   * Michigan-specific tax validation
   * Michigan doesn't tax SaaS but may tax downloaded software
   */
  async validateMichiganTax(transactionType: 'saas' | 'downloaded_software' | 'digital_goods'): Promise<{
    taxable: boolean;
    reason: string;
    rate: number;
  }> {
    switch (transactionType) {
      case 'saas':
        return {
          taxable: false,
          reason: 'SaaS is non-taxable in Michigan as it does not involve transfer of tangible personal property',
          rate: 0
        };
      case 'downloaded_software':
        return {
          taxable: true,
          reason: 'Downloaded prewritten software is taxable in Michigan',
          rate: 0.06 // 6% Michigan sales tax
        };
      case 'digital_goods':
        return {
          taxable: false,
          reason: 'Digital goods like e-books, music, videos are not taxable in Michigan',
          rate: 0
        };
      default:
        return {
          taxable: false,
          reason: 'Unknown transaction type',
          rate: 0
        };
    }
  }

  /**
   * Process tax-inclusive payment for marketplace transaction
   */
  async createTaxInclusivePayment(params: {
    platformId: string;
    sellerId: string;
    buyerId: string;
    amount: number;
    currency: string;
    description: string;
    customerAddress: {
      country: string;
      state?: string;
      city?: string;
      postalCode?: string;
    };
    productType: 'saas' | 'downloaded_software' | 'digital_goods';
  }): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    taxCalculation: any;
    michiganTaxInfo: any;
  }> {
    const { amount, currency, customerAddress, productType, sellerId, ...paymentParams } = params;

    // Validate Michigan tax requirements
    const michiganTaxInfo = await this.validateMichiganTax(productType);

    // Calculate tax using Stripe Tax
    const taxCalculation = await this.calculateTax({
      amount,
      currency,
      customerAddress,
      productTaxCode: this.getProductTaxCode(productType),
      connectedAccountId: sellerId
    });

    // Import dynamic platform fee calculation
    const { calculatePlatformFee } = await import('../stripe-config.js');
        
        // Calculate dynamic platform fee based on seller tier
        const transactionValue = amount >= 50000 ? 'high' : amount <= 1000 ? 'low' : 'medium';
        const sellerTier = 'standard'; // This should come from seller data in real implementation
        const platformFee = calculatePlatformFee({ amount, sellerTier, transactionValue });
    
    // Determine final amounts
    const taxAmount = taxCalculation.tax_amount_exclusive || 0;
    const totalAmount = amount + taxAmount;

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalAmount,
      currency,
      description: paymentParams.description,
      metadata: {
        platform_id: paymentParams.platformId,
        buyer_id: paymentParams.buyerId,
        seller_id: sellerId,
        product_type: productType,
        tax_calculation_id: taxCalculation.id,
        michigan_taxable: michiganTaxInfo.taxable.toString(),
        original_amount: amount.toString(),
        tax_amount: taxAmount.toString(),
      },
      
      // Set up destination charge for seller
      transfer_data: {
        destination: sellerId,
        amount: amount - platformFee, // Seller gets original amount minus platform fee
      },
      
      // Platform takes commission
      application_fee_amount: platformFee,
      
      // Manual capture for escrow
      capture_method: 'manual',
    });

    return {
      paymentIntent,
      taxCalculation,
      michiganTaxInfo
    };
  }

  /**
   * Get tax code for product type
   */
  private getProductTaxCode(productType: string): string {
    switch (productType) {
      case 'saas':
        return PRODUCT_TAX_CODES.SOFTWARE_PLATFORMS;
      case 'downloaded_software':
        return PRODUCT_TAX_CODES.SOFTWARE_PLATFORMS;
      case 'digital_goods':
        return PRODUCT_TAX_CODES.DIGITAL_PRODUCTS;
      default:
        return PRODUCT_TAX_CODES.SOFTWARE_PLATFORMS;
    }
  }

  /**
   * Get current tax settings
   */
  async getTaxSettings(accountId?: string): Promise<Stripe.Tax.Settings> {
    try {
      return await this.stripe.tax.settings.retrieve(
        accountId ? { stripeAccount: accountId } : undefined
      );
    } catch (error) {
      console.error('Failed to retrieve tax settings:', error);
      throw new Error('Tax settings retrieval failed');
    }
  }

  /**
   * List tax registrations
   */
  async listTaxRegistrations(accountId?: string): Promise<Stripe.ApiList<Stripe.Tax.Registration>> {
    try {
      return await this.stripe.tax.registrations.list(
        { limit: 100 },
        accountId ? { stripeAccount: accountId } : undefined
      );
    } catch (error) {
      console.error('Failed to list tax registrations:', error);
      throw new Error('Tax registrations listing failed');
    }
  }
}

// Export default instance
export const taxService = new TaxConfigurationService();

// Michigan-specific tax utilities
export const MichiganTaxUtils = {
  /**
   * Check if transaction is subject to Michigan sales tax
   */
  isTaxableInMichigan(transactionType: 'saas' | 'downloaded_software' | 'digital_goods'): boolean {
    // Based on Michigan law: SaaS and digital goods are not taxable, downloaded software is taxable
    return transactionType === 'downloaded_software';
  },

  /**
   * Get Michigan sales tax rate
   */
  getMichiganTaxRate(): number {
    return 0.06; // 6% statewide, no local taxes
  },

  /**
   * Determine if business needs to collect Michigan tax
   */
  shouldCollectMichiganTax(
    nexusType: 'physical' | 'economic' | 'none',
    annualSales: number,
    transactionCount: number
  ): boolean {
    if (nexusType === 'physical') return true;
    
    // Economic nexus thresholds for Michigan
    return annualSales >= 100000 || transactionCount >= 200;
  }
};
