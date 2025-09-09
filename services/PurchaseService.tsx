import RNIap, {
    Product,
    ProductPurchase,
    SubscriptionPurchase,
    PurchaseError,
    Subscription,
    initConnection,
    endConnection,
    getProducts,
    getSubscriptions,
    requestPurchase,
    requestSubscription,
    finishTransaction,
    purchaseErrorListener,
    purchaseUpdatedListener,
  } from 'react-native-iap';
  import { getSupabase } from '../lib/supabase';
  import * as Haptics from 'expo-haptics';
  
  // Product IDs matching Google Play Console
  const coinProductIds = [
    'com.vidgro.coins.starter',   // 1,000 + 100 bonus = 1,100 coins for ₹29
    'com.vidgro.coins.creator',   // 2,500 + 500 bonus = 3,000 coins for ₹69  
    'com.vidgro.coins.pro',       // 5,000 + 1,500 bonus = 6,500 coins for ₹129
  ];
  
  const vipSubscriptionIds = [
    'com.vidgro.vip.weekly',      // Weekly VIP for ₹99
    'com.vidgro.vip.monthly',     // Monthly VIP for ₹299
  ];
  
  // Coin amounts for each package
  const coinAmounts = {
    'com.vidgro.coins.starter': 1100,
    'com.vidgro.coins.creator': 3000,
    'com.vidgro.coins.pro': 6500,
  };
  
  export class PurchaseService {
    private static instance: PurchaseService;
    private isInitialized = false;
    private products: Product[] = [];
    private subscriptions: Subscription[] = [];
    private purchaseUpdateSubscription: any = null;
    private purchaseErrorSubscription: any = null;
  
    static getInstance(): PurchaseService {
      if (!PurchaseService.instance) {
        PurchaseService.instance = new PurchaseService();
      }
      return PurchaseService.instance;
    }
  
    async initialize(): Promise<boolean> {
      try {
        if (this.isInitialized) return true;
  
        const result = await initConnection();
        
        if (result) {
          this.isInitialized = true;
          await this.loadProducts();
          this.setupListeners();
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }
  
    private async loadProducts() {
      try {
        // Load coin products
        this.products = await getProducts({ skus: coinProductIds });
        
        // Load VIP subscriptions
        this.subscriptions = await getSubscriptions({ skus: vipSubscriptionIds });
        
      } catch (error) {
        // Failed to load products
      }
    }
  
    private setupListeners() {
      // Purchase success listener
      this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase: ProductPurchase | SubscriptionPurchase) => {
        this.handlePurchaseUpdate(purchase);
      });
  
      // Purchase error listener
      this.purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      });
    }
  
    private async handlePurchaseUpdate(purchase: ProductPurchase | SubscriptionPurchase) {
      try {
        // Process the purchase
        await this.processPurchase(purchase);
        
        // Finish transaction to complete purchase
        await finishTransaction({ purchase });
        
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  
    async purchaseCoins(productId: string): Promise<boolean> {
      try {
        if (!this.isInitialized) {
          const initialized = await this.initialize();
          if (!initialized) {
            throw new Error('Failed to initialize IAP');
          }
        }
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        await requestPurchase({ sku: productId });
        return true;
        
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    }
  
    async purchaseVIP(subscriptionId: string): Promise<boolean> {
      try {
        if (!this.isInitialized) {
          const initialized = await this.initialize();
          if (!initialized) {
            throw new Error('Failed to initialize IAP');
          }
        }
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        await requestSubscription({ sku: subscriptionId });
        return true;
        
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    }
  
    private async processPurchase(purchase: ProductPurchase | SubscriptionPurchase) {
      const { productId } = purchase;
      const supabase = getSupabase();
      
      try {
        // Award coins for coin packages
        if (coinProductIds.includes(productId)) {
          const coins = coinAmounts[productId as keyof typeof coinAmounts];
          
          // Update coins in database using the increment function
          const { error } = await supabase.rpc('increment_user_coins', {
            user_id_param: (await supabase.auth.getUser()).data.user?.id,
            coins_to_add: coins
          });
          
          if (error) {
            throw error;
          }
        }
        
        // Activate VIP subscription
        if (vipSubscriptionIds.includes(productId)) {
          const now = new Date();
          let vipExpiry: Date;
          
          if (productId === 'com.vidgro.vip.weekly') {
            vipExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
          } else if (productId === 'com.vidgro.vip.monthly') {
            vipExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          } else {
            throw new Error('Unknown VIP subscription type');
          }
          
          // Update VIP status in database
          const { error } = await supabase
            .from('profiles')
            .update({ 
              is_vip: true,
              vip_expiry: vipExpiry.toISOString()
            })
            .eq('id', (await supabase.auth.getUser()).data.user?.id);
          
          if (error) {
            throw error;
          }
        }
        
      } catch (error) {
        throw error;
      }
    }
  
    getProducts(): Product[] {
      return this.products;
    }
  
    getSubscriptions(): Subscription[] {
      return this.subscriptions;
    }
  
    getProductById(productId: string): Product | undefined {
      return this.products.find(product => product.productId === productId);
    }
  
    getSubscriptionById(subscriptionId: string): Subscription | undefined {
      return this.subscriptions.find(sub => sub.productId === subscriptionId);
    }
  
    async cleanup() {
      try {
        if (this.purchaseUpdateSubscription) {
          this.purchaseUpdateSubscription.remove();
        }
        if (this.purchaseErrorSubscription) {
          this.purchaseErrorSubscription.remove();
        }
        
        await endConnection();
        this.isInitialized = false;
      } catch (error) {
        // IAP cleanup error
      }
    }
  }
  
  export default PurchaseService.getInstance();