import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Print from 'expo-print';
import SunmiPrinter from '../utils/SunmiPrinter';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://pos-foodbev.emergent.host';

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  price: number;
}

interface Modifier {
  id: string;
  name: string;
  cost: number;
  category_ids: string[];
}

interface CartItemModifier {
  modifier_id: string;
  name: string;
  cost: number;
}

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: CartItemModifier[];
}

export default function DashboardScreen() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddModifier, setShowAddModifier] = useState(false);
  const [showItemCustomization, setShowItemCustomization] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showEditModifier, setShowEditModifier] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  
  // Printer configuration states
  const [printerDevices, setPrinterDevices] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [detectingPrinter, setDetectingPrinter] = useState(false);
  const [receiptLogo, setReceiptLogo] = useState<string>('');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [companyAddress, setCompanyAddress] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your order!');
  
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [showEditCategory, setShowEditCategory] = useState(false);
  
  // Modifier states
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [modifierName, setModifierName] = useState('');
  const [modifierCost, setModifierCost] = useState('');
  const [modifierCategoryIds, setModifierCategoryIds] = useState<string[]>([]);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);
  
  // Item customization states
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<Item | null>(null);
  const [selectedModifiersForItem, setSelectedModifiersForItem] = useState<string[]>([]);
  const [customizationQuantity, setCustomizationQuantity] = useState(1);
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  
  const [salesReport, setSalesReport] = useState<any>(null);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [salesDateFilter, setSalesDateFilter] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'sales' | 'returns'>('all');
  const [salesDetailsReport, setSalesDetailsReport] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [returnType, setReturnType] = useState<'full' | 'partial'>('full');
  const [itemsToReturn, setItemsToReturn] = useState<string[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.replace('/');
    } else {
      loadCategories();
      loadItems();
      loadModifiers();
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (selectedCategory) {
      setFilteredItems(items.filter(item => item.category_id === selectedCategory));
    } else {
      setFilteredItems(items);
    }
  }, [selectedCategory, items]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/categories`, {
        headers: getAuthHeaders(),
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadItems = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/items`, {
        headers: getAuthHeaders(),
      });
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadModifiers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/modifiers`, {
        headers: getAuthHeaders(),
      });
      setModifiers(response.data);
    } catch (error) {
      console.error('Error loading modifiers:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/categories`,
        { name: categoryName },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Category added successfully');
      setCategoryName('');
      setShowAddCategory(false);
      loadCategories();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add category';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryLongPress = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setCategoryName(category.name);
    setShowEditCategory(true);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategoryForEdit || !categoryName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${BACKEND_URL}/api/categories/${selectedCategoryForEdit.id}`,
        { name: categoryName },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Category updated successfully');
      setCategoryName('');
      setSelectedCategoryForEdit(null);
      setShowEditCategory(false);
      loadCategories();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update category';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = () => {
    if (!selectedCategoryForEdit) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${selectedCategoryForEdit.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${BACKEND_URL}/api/categories/${selectedCategoryForEdit.id}`,
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Category deleted successfully');
              setCategoryName('');
              setSelectedCategoryForEdit(null);
              setShowEditCategory(false);
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete category');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddItem = async () => {
    if (!itemName.trim() || !itemPrice || !itemCategoryId) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/items`,
        {
          name: itemName,
          category_id: itemCategoryId,
          price: parseFloat(itemPrice),
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Item added successfully');
      setItemName('');
      setItemPrice('');
      setItemCategoryId('');
      setShowAddItem(false);
      loadItems();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add item';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModifierCategorySelection = (categoryId: string) => {
    if (modifierCategoryIds.includes(categoryId)) {
      setModifierCategoryIds(modifierCategoryIds.filter(id => id !== categoryId));
    } else {
      setModifierCategoryIds([...modifierCategoryIds, categoryId]);
    }
  };

  const handleAddModifier = async () => {
    if (!modifierName.trim() || !modifierCost || modifierCategoryIds.length === 0) {
      Alert.alert('Error', 'Please fill all fields and select at least one category');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/modifiers`,
        {
          name: modifierName,
          cost: parseFloat(modifierCost),
          category_ids: modifierCategoryIds,
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Modifier added successfully');
      setModifierName('');
      setModifierCost('');
      setModifierCategoryIds([]);
      setShowAddModifier(false);
      loadModifiers();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add modifier';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleModifierLongPress = (modifier: Modifier) => {
    setSelectedModifier(modifier);
    setModifierName(modifier.name);
    setModifierCost(modifier.cost.toString());
    setModifierCategoryIds(modifier.category_ids);
    setShowEditModifier(true);
  };

  const handleUpdateModifier = async () => {
    if (!selectedModifier || !modifierName.trim() || !modifierCost || modifierCategoryIds.length === 0) {
      Alert.alert('Error', 'Please fill all fields and select at least one category');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${BACKEND_URL}/api/modifiers/${selectedModifier.id}`,
        {
          name: modifierName,
          cost: parseFloat(modifierCost),
          category_ids: modifierCategoryIds,
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Modifier updated successfully');
      setModifierName('');
      setModifierCost('');
      setModifierCategoryIds([]);
      setSelectedModifier(null);
      setShowEditModifier(false);
      loadModifiers();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update modifier';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModifier = () => {
    if (!selectedModifier) return;

    Alert.alert(
      'Delete Modifier',
      `Are you sure you want to delete "${selectedModifier.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${BACKEND_URL}/api/modifiers/${selectedModifier.id}`,
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Modifier deleted successfully');
              setModifierName('');
              setModifierCost('');
              setModifierCategoryIds([]);
              setSelectedModifier(null);
              setShowEditModifier(false);
              loadModifiers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete modifier');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openItemCustomization = (item: Item) => {
    setSelectedItemForCustomization(item);
    setSelectedModifiersForItem([]);
    setCustomizationQuantity(1);
    setShowItemCustomization(true);
  };

  const toggleModifierSelection = (modifierId: string) => {
    if (selectedModifiersForItem.includes(modifierId)) {
      setSelectedModifiersForItem(selectedModifiersForItem.filter(id => id !== modifierId));
    } else {
      setSelectedModifiersForItem([...selectedModifiersForItem, modifierId]);
    }
  };

  const calculateCustomizationTotal = () => {
    if (!selectedItemForCustomization) return 0;
    
    const basePrice = selectedItemForCustomization.price;
    const modifiersCost = selectedModifiersForItem.reduce((total, modifierId) => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return total + (modifier?.cost || 0);
    }, 0);
    
    return (basePrice + modifiersCost) * customizationQuantity;
  };

  const addCustomizedItemToCart = () => {
    if (!selectedItemForCustomization) return;

    const selectedModifierObjects: CartItemModifier[] = selectedModifiersForItem.map(modifierId => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return {
        modifier_id: modifier!.id,
        name: modifier!.name,
        cost: modifier!.cost,
      };
    });

    const itemWithModifiers: CartItem = {
      item_id: selectedItemForCustomization.id,
      name: selectedItemForCustomization.name,
      price: selectedItemForCustomization.price,
      quantity: customizationQuantity,
      modifiers: selectedModifierObjects,
    };

    setCart([...cart, itemWithModifiers]);
    setShowItemCustomization(false);
    setSelectedItemForCustomization(null);
    setSelectedModifiersForItem([]);
    setCustomizationQuantity(1);
  };

  const handleItemLongPress = (item: Item) => {
    setSelectedItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemCategoryId(item.category_id);
    setShowEditItem(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !itemName.trim() || !itemPrice || !itemCategoryId) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${BACKEND_URL}/api/items/${selectedItem.id}`,
        {
          name: itemName,
          category_id: itemCategoryId,
          price: parseFloat(itemPrice),
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Item updated successfully');
      setItemName('');
      setItemPrice('');
      setItemCategoryId('');
      setSelectedItem(null);
      setShowEditItem(false);
      loadItems();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update item';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${selectedItem.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${BACKEND_URL}/api/items/${selectedItem.id}`,
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Item deleted successfully');
              setSelectedItem(null);
              setShowEditItem(false);
              loadItems();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete item');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getDateRangeForFilter = () => {
    const now = new Date();
    let startDate, endDate;

    switch (salesDateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        endDate = now;
        break;
      case 'custom':
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return { startDate, endDate };
  };

  const loadSalesReport = async () => {
    // Day Closing Report - Only today's data, no filters
    setLoading(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const response = await axios.get(`${BACKEND_URL}/api/sales-report`, {
        headers: getAuthHeaders(),
        params: {
          start_date: startOfDay.toISOString(),
          end_date: endOfDay.toISOString()
        }
      });
      setSalesReport(response.data);
      setShowSalesReport(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load day closing report');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesDetails = async () => {
    // Sales Details - Load orders list with date filters
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForFilter();
      
      // Load summary stats
      const statsResponse = await axios.get(`${BACKEND_URL}/api/sales-report`, {
        headers: getAuthHeaders(),
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          filter_type: salesTypeFilter
        }
      });
      setSalesDetailsReport(statsResponse.data);

      // Load detailed orders list
      const ordersResponse = await axios.get(`${BACKEND_URL}/api/orders-list`, {
        headers: getAuthHeaders(),
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: salesTypeFilter
        }
      });
      setOrdersList(ordersResponse.data);
      
      setShowSalesDetails(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load sales details');
    } finally {
      setLoading(false);
    }
  };

  const updateCartQuantity = (item_id: string, delta: number) => {
    const cartItem = cart.find(i => i.item_id === item_id);
    
    if (cartItem) {
      const newQuantity = cartItem.quantity + delta;
      
      if (newQuantity <= 0) {
        removeFromCart(item_id);
      } else {
        setCart(cart.map(i =>
          i.item_id === item_id ? { ...i, quantity: newQuantity } : i
        ));
      }
    }
  };

  const removeFromCart = (item_id: string) => {
    setCart(cart.filter(item => item.item_id !== item_id));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    const discount = parseFloat(discountPercent) || 0;
    const subtotal = getSubtotal();
    return (subtotal * discount) / 100;
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountAmount();
  };

  const getChange = () => {
    const cash = parseFloat(cashAmount) || 0;
    const total = getTotal();
    return cash - total;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart');
      return;
    }

    const subtotal = getSubtotal();
    const discountPercentage = parseFloat(discountPercent) || 0;
    const discountAmount = getDiscountAmount();
    const total = getTotal();

    if (paymentMethod === 'cash') {
      const cash = parseFloat(cashAmount);
      if (!cashAmount || isNaN(cash)) {
        Alert.alert('Invalid Amount', 'Please enter cash amount');
        return;
      }
      if (cash < total) {
        Alert.alert('Insufficient Amount', `Cash amount must be at least $${total.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);
    try {
      const orderData: any = {
        items: cart,
        subtotal: subtotal,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        total: total,
        payment_method: paymentMethod,
      };

      if (paymentMethod === 'cash') {
        orderData.cash_amount = parseFloat(cashAmount);
        orderData.change_amount = getChange();
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/orders`,
        orderData,
        { headers: getAuthHeaders() }
      );

      const order = response.data;
      
      // Generate and print receipt
      await printReceipt(order);
      
      // Clear cart and reset
      setCart([]);
      setCashAmount('');
      setDiscountPercent('');
      setShowCheckout(false);
      
      // Reload items
      loadItems();
      
      Alert.alert('Success', `Order ${order.order_number} placed successfully!`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (order: any) => {
    try {
      // Try SunMi printer first (for Android devices)
      if (Platform.OS === 'android') {
        const receiptData = {
          orderNumber: order.order_number,
          items: order.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers || [],
          })),
          subtotal: order.total,
          total: order.total,
          paymentMethod: order.payment_method,
          salesPerson: order.sales_person || 'Staff',
          timestamp: order.timestamp || new Date(order.created_at).toLocaleString(),
          companyName: companyName || 'GoPos POS',
          companyAddress: companyAddress || '',
        };

        const printed = await SunmiPrinter.printReceipt(receiptData);
        if (printed) {
          console.log('Receipt printed via SunMi printer');
          return;
        }
      }

      // Fallback to expo-print for web/iOS or if SunMi fails
      const html = `
      <html>
        <head>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              max-width: 300px;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .company-address { font-size: 12px; margin: 5px 0; }
            .divider { border-top: 1px dashed #000; margin: 15px 0; }
            .order-info { text-align: center; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
            .total-section { margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; }
            .total-row { font-weight: bold; font-size: 16px; margin: 5px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 2px dashed #000; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${receiptLogo ? `<img src="${receiptLogo}" class="logo" alt="Logo" />` : ''}
            <div class="company-name">${companyName || user?.company_name || 'GoPos'}</div>
            <div class="company-address">${companyAddress || 'Address not set'}</div>
          </div>
          
          <div class="order-info">
            <strong>RECEIPT</strong><br/>
            Order #: ${order.order_number}<br/>
            Date: ${new Date(order.created_at).toLocaleString()}<br/>
            Payment: ${order.payment_method.toUpperCase()}
          </div>
          
          <div class="divider"></div>
          
          <div>
            ${order.items.map((item: any) => `
              <div class="item-row">
                <span>${item.name} x${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="total-section">
            <div class="item-row">
              <span>Subtotal:</span>
              <span>$${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.discount_percentage > 0 ? `
              <div class="item-row">
                <span>Discount (${order.discount_percentage}%):</span>
                <span>-$${order.discount_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <div class="item-row">
                <span>Total:</span>
                <span>$${order.total.toFixed(2)}</span>
              </div>
            </div>
            ${order.payment_method === 'cash' ? `
              <div class="item-row">
                <span>Cash:</span>
                <span>$${order.cash_amount.toFixed(2)}</span>
              </div>
              <div class="item-row">
                <span>Change:</span>
                <span>$${order.change_amount.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            ${receiptFooter || 'Thank you for your order!'}
          </div>
        </body>
      </html>
      `;

      const printOptions: any = {
        html,
      };

      // If a printer is selected, use it
      if (selectedPrinter?.url) {
        printOptions.printerUrl = selectedPrinter.url;
      }

      await Print.printAsync(printOptions);
    } catch (error) {
      console.error('Print error:', error);
      // Don't show error, order was successful
    }
  };

  const printSalesReport = async (report: any) => {
    if (!report) return;

    // Try SunMi printer first (for Android devices)
    if (Platform.OS === 'android') {
      const reportData = {
        date: new Date().toLocaleDateString(),
        totalOrders: report.total_orders || 0,
        totalRevenue: report.total_sales || 0,
        totalItems: report.total_items || 0,
        paymentBreakdown: {
          cash: report.cash_sales || 0,
          qr: report.qr_sales || 0,
        },
      };

      const printed = await SunmiPrinter.printSalesReport(reportData);
      if (printed) {
        console.log('Sales report printed via SunMi printer');
        return;
      }
    }

    // Fallback to expo-print
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; color: #4CAF50; }
            .report-date { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
            .summary { margin-bottom: 30px; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
            .summary-label { font-weight: 600; }
            .summary-value { color: #4CAF50; font-weight: bold; }
            h2 { color: #333; margin-top: 30px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #4CAF50; color: white; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>Daily Sales Report</h1>
          <div class="report-date">${new Date(report.date).toLocaleDateString()}</div>
          
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Total Sales:</span>
              <span class="summary-value">$${report.total_sales.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Orders:</span>
              <span class="summary-value">${report.total_orders}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Cash Sales:</span>
              <span class="summary-value">$${report.cash_sales.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">QR Sales:</span>
              <span class="summary-value">$${report.qr_sales.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Discount Given:</span>
              <span class="summary-value">$${report.total_discount.toFixed(2)}</span>
            </div>
          </div>

          <h2>Top Selling Items</h2>
          <table>
            <tr>
              <th>Item Name</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
            ${report.top_items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>

          <div class="footer">
            <p>End of Day Closing Report</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Note', 'Report generated but printer not available');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        onPress: async () => {
          try {
            await logout();
            router.replace('/');
          } catch (error) {
            console.error('Logout error:', error);
            router.replace('/');
          }
        }
      },
    ]);
  };

  const detectPrinters = async () => {
    setDetectingPrinter(true);
    try {
      // For expo-print, we'll use a simpler approach
      // Add system default printer option
      const systemPrinter = {
        id: 'system_default',
        name: 'System Default Printer',
        type: 'Internal',
        status: 'Available',
        url: null,
      };
      
      setPrinterDevices([systemPrinter]);
      setSelectedPrinter(systemPrinter);
      Alert.alert('Success', 'System default printer configured. Make sure your Bluetooth printer is paired in device settings first.');
    } catch (error: any) {
      console.error('Printer detection error:', error);
      Alert.alert('Error', 'Failed to configure printer settings.');
    } finally {
      setDetectingPrinter(false);
    }
  };

  const pickReceiptLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setReceiptLogo(base64Image);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const testPrint = async () => {
    if (!selectedPrinter) {
      Alert.alert('No Printer', 'Please select a printer first');
      return;
    }

    const testReceipt = generateReceiptPreview();
    try {
      // Direct print without preview dialog
      const printOptions: any = {
        html: testReceipt,
        printerUrl: selectedPrinter.url,
      };

      // If printer has a URL, use it directly
      if (selectedPrinter.url) {
        await Print.printAsync(printOptions);
      } else {
        // For system default, print without printer selection
        await Print.printAsync({ 
          html: testReceipt,
        });
      }
      
      Alert.alert('Success', `Test receipt sent to ${selectedPrinter.name}`);
    } catch (error: any) {
      console.error('Print error:', error);
      Alert.alert('Print Error', `Failed to print: ${error.message || 'Unknown error'}\n\nMake sure your Bluetooth printer is:\n1. Turned on\n2. Paired in device Bluetooth settings\n3. Set as default printer`);
    }
  };

  const toggleOrderExpanded = (orderId: string) => {
    if (expandedOrders.includes(orderId)) {
      setExpandedOrders(expandedOrders.filter(id => id !== orderId));
    } else {
      setExpandedOrders([...expandedOrders, orderId]);
    }
  };

  const processReturn = async (printReceipt: boolean) => {
    if (!selectedOrderForReturn) return;

    setLoading(true);
    try {
      let returnResponse;

      if (returnType === 'partial' && itemsToReturn.length > 0) {
        // Partial return - return specific items
        const itemsToReturnData = itemsToReturn.map(itemKey => {
          const parts = itemKey.split('-');
          const idx = parseInt(parts[parts.length - 1]);
          return selectedOrderForReturn.items[idx];
        });

        returnResponse = await axios.post(
          `${BACKEND_URL}/api/orders/${selectedOrderForReturn.id}/return-item`,
          { items: itemsToReturnData },
          { headers: getAuthHeaders() }
        );
      } else {
        // Full return - return entire order
        returnResponse = await axios.post(
          `${BACKEND_URL}/api/orders/${selectedOrderForReturn.id}/return`,
          {},
          { headers: getAuthHeaders() }
        );
      }

      Alert.alert('Success', `${returnType === 'partial' ? 'Items' : 'Order'} returned successfully`);

      // Print receipt if requested
      if (printReceipt) {
        const itemsToPrint = returnType === 'partial' && itemsToReturn.length > 0
          ? itemsToReturn.map(itemKey => {
              const parts = itemKey.split('-');
              const idx = parseInt(parts[parts.length - 1]);
              return selectedOrderForReturn.items[idx];
            })
          : selectedOrderForReturn.items;

        const returnReceiptData = {
          orderNumber: selectedOrderForReturn.order_number,
          items: itemsToPrint,
          subtotal: returnAmount,
          total: returnAmount,
          paymentMethod: selectedOrderForReturn.payment_method,
          salesPerson: selectedOrderForReturn.sales_person,
          timestamp: new Date().toLocaleString(),
          companyName: companyName || 'GoPos POS',
          companyAddress: companyAddress || '',
          isReturn: true,
        };

        if (Platform.OS === 'android') {
          await SunmiPrinter.printReceipt(returnReceiptData);
        } else {
          // Fallback to expo-print for web/iOS
          printReceipt(returnReceiptData);
        }
      }

      // Reload sales details and reset state
      setSelectedOrderForReturn(null);
      setItemsToReturn([]);
      setReturnType('full');
      setReturnAmount(0);
      setShowReturnConfirm(false);
      loadSalesDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const testPrinter = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Info', 'SunMi printer test is only available on Android devices');
      return;
    }

    setDetectingPrinter(true);
    try {
      const success = await SunmiPrinter.testPrint();
      if (success) {
        Alert.alert('Success', 'Test print completed! Check your printer.');
      } else {
        Alert.alert('Error', 'Test print failed. Make sure you are on a SunMi device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test printer: ' + error);
    } finally {
      setDetectingPrinter(false);
    }
  };

  const generateReceiptPreview = () => {
    return `
      <html>
        <head>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              max-width: 300px;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .company-address { font-size: 12px; margin: 5px 0; }
            .divider { border-top: 1px dashed #000; margin: 15px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
            .total-row { font-weight: bold; font-size: 16px; margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 2px dashed #000; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${receiptLogo ? `<img src="${receiptLogo}" class="logo" alt="Logo" />` : ''}
            <div class="company-name">${companyName || 'Your Company Name'}</div>
            <div class="company-address">${companyAddress || 'Company Address Here'}</div>
          </div>
          
          <div>
            <div style="text-align: center; margin: 15px 0;">
              <strong>RECEIPT</strong><br/>
              Order #: ORD00001<br/>
              Date: ${new Date().toLocaleString()}
            </div>
            
            <div class="divider"></div>
            
            <div class="item-row">
              <span>Item 1 x2</span>
              <span>$10.00</span>
            </div>
            <div class="item-row">
              <span>Item 2 x1</span>
              <span>$5.50</span>
            </div>
            
            <div class="total-row">
              <div class="item-row">
                <span>Total:</span>
                <span>$15.50</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            ${receiptFooter || 'Thank you for your order!'}
          </div>
        </body>
      </html>
    `;
  };

  const subtotal = getSubtotal();

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://customer-assets.emergentagent.com/job_gopos-app/artifacts/nbu2lf79_gopos%20white.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContainer}>
        {/* Left Sidebar */}
        {sidebarOpen && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarWelcome}>Welcome</Text>
              <Text style={styles.sidebarCompany}>{user?.company_name || user?.name}</Text>
            </View>
            
            <ScrollView style={styles.sidebarContent}>
              <TouchableOpacity style={styles.sidebarItem}>
                <Ionicons name="grid" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowReportMenu(!showReportMenu)}>
                <Ionicons name="stats-chart" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Report</Text>
                <Ionicons name={showReportMenu ? "chevron-up" : "chevron-down"} size={20} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {showReportMenu && (
                <>
                  <TouchableOpacity style={styles.sidebarSubItem} onPress={loadSalesReport}>
                    <Ionicons name="calendar" size={20} color="#666" />
                    <Text style={styles.sidebarSubItemText}>Day Closing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sidebarSubItem} onPress={loadSalesDetails}>
                    <Ionicons name="receipt" size={20} color="#666" />
                    <Text style={styles.sidebarSubItemText}>Sales Details</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowAddCategory(true)}>
                <Ionicons name="list" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Categories</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowAddItem(true)}>
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Add Item</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowAddModifier(true)}>
                <Ionicons name="pricetag" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Add Modifier</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowSettings(true)}>
                <Ionicons name="settings" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowPrinterConfig(true)}>
                <Ionicons name="print" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>Printer Config</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => setShowAbout(true)}>
                <Ionicons name="information-circle" size={24} color="#4CAF50" />
                <Text style={styles.sidebarItemText}>About Us</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {/* Horizontal Categories */}
          <View style={styles.categoriesBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity
                style={[styles.categoryChipHorizontal, !selectedCategory && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipTextHorizontal, !selectedCategory && styles.categoryChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChipHorizontal,
                    selectedCategory === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                  onLongPress={() => handleCategoryLongPress(category)}
                >
                  <Text style={[
                    styles.categoryChipTextHorizontal,
                    selectedCategory === category.id && styles.categoryChipTextActive,
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Items Grid */}
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.itemsGridNew}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemCardNew}
                onPress={() => openItemCustomization(item)}
                onLongPress={() => handleItemLongPress(item)}
              >
                <Text style={styles.itemNameNew} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.itemPriceNew}>${item.price.toFixed(2)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="basket-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No items available</Text>
              </View>
            }
          />
        </View>

      </View>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingCartButton}
          onPress={() => setShowCartDrawer(true)}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.length}</Text>
          </View>
          <Ionicons name="cart" size={28} color="#fff" />
          <Text style={styles.floatingCartText}>${subtotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Cart Drawer */}
      <Modal
        visible={showCartDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCartDrawer(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity 
            style={styles.drawerBackdrop} 
            activeOpacity={1}
            onPress={() => setShowCartDrawer(false)}
          />
          
          <View style={styles.drawerContent}>
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setShowCartDrawer(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Drawer Description */}
            <Text style={styles.drawerDescription}>
              Review your order items
            </Text>

            {/* Cart Items */}
            <ScrollView style={styles.drawerItemsList}>
              {cart.map((item, index) => (
                <View key={`${item.item_id}-${index}`} style={styles.drawerCartItem}>
                  <View style={styles.drawerItemInfo}>
                    <Text style={styles.drawerItemName}>{item.name}</Text>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <View style={styles.modifiersInCart}>
                        {item.modifiers.map((mod, idx) => (
                          <Text key={idx} style={styles.modifierInCartText}>
                            + {mod.name} (+${mod.cost.toFixed(2)})
                          </Text>
                        ))}
                      </View>
                    )}
                    <Text style={styles.drawerItemPrice}>
                      ${item.price.toFixed(2)} x {item.quantity}
                      {item.modifiers && item.modifiers.length > 0 && ` = $${(item.price + item.modifiers.reduce((sum, m) => sum + m.cost, 0)) * item.quantity}`}
                    </Text>
                  </View>
                  
                  <View style={styles.drawerItemActions}>
                    <TouchableOpacity
                      onPress={() => updateCartQuantity(item.item_id, -1)}
                      style={styles.drawerQuantityBtn}
                    >
                      <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    
                    <Text style={styles.drawerQuantity}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      onPress={() => updateCartQuantity(item.item_id, 1)}
                      style={styles.drawerQuantityBtn}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeFromCart(item.item_id)}
                      style={styles.drawerDeleteBtn}
                    >
                      <Ionicons name="trash" size={18} color="#f44336" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.drawerItemTotal}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Drawer Footer */}
            <View style={styles.drawerFooter}>
              <View style={styles.drawerSubtotalRow}>
                <Text style={styles.drawerSubtotalLabel}>Subtotal:</Text>
                <Text style={styles.drawerSubtotalValue}>${subtotal.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={styles.drawerCheckoutButton}
                onPress={() => {
                  setShowCartDrawer(false);
                  setShowCheckout(true);
                }}
              >
                <Text style={styles.drawerCheckoutText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerCloseButton}
                onPress={() => setShowCartDrawer(false)}
              >
                <Text style={styles.drawerCloseText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={showAddCategory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Category</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Category Name"
              value={categoryName}
              onChangeText={setCategoryName}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddCategory(false);
                  setCategoryName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={showEditCategory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Category Name"
              value={categoryName}
              onChangeText={setCategoryName}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditCategory(false);
                  setSelectedCategoryForEdit(null);
                  setCategoryName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Item Name"
              value={itemName}
              onChangeText={setItemName}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Category:</Text>
              <ScrollView horizontal style={styles.categoryPicker}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      itemCategoryId === cat.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setItemCategoryId(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      itemCategoryId === cat.id && styles.categoryChipTextSelected,
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Price"
              value={itemPrice}
              onChangeText={setItemPrice}
              keyboardType="decimal-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddItem(false);
                  setItemName('');
                  setItemPrice('');
                  setItemCategoryId('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddItem}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Item Name"
              value={itemName}
              onChangeText={setItemName}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Category:</Text>
              <ScrollView horizontal style={styles.categoryPicker}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      itemCategoryId === cat.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setItemCategoryId(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      itemCategoryId === cat.id && styles.categoryChipTextSelected,
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Price"
              value={itemPrice}
              onChangeText={setItemPrice}
              keyboardType="decimal-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteItem}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditItem(false);
                  setSelectedItem(null);
                  setItemName('');
                  setItemPrice('');
                  setItemCategoryId('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateItem}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modifier Modal */}
      <Modal visible={showAddModifier} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Modifier</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Modifier Name (e.g., Extra Ice, Less Sugar)"
              value={modifierName}
              onChangeText={setModifierName}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Categories (select multiple):</Text>
              <ScrollView horizontal style={styles.categoryPicker}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      modifierCategoryIds.includes(cat.id) && styles.categoryChipSelected,
                    ]}
                    onPress={() => toggleModifierCategorySelection(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      modifierCategoryIds.includes(cat.id) && styles.categoryChipTextSelected,
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Cost (Additional price)"
              value={modifierCost}
              onChangeText={setModifierCost}
              keyboardType="decimal-pad"
            />

            {/* Show existing modifiers for the selected categories */}
            {modifierCategoryIds.length > 0 && (
              <View style={styles.existingModifiersSection}>
                <Text style={styles.existingModifiersTitle}>
                  Existing modifiers for selected categories:
                </Text>
                <ScrollView style={styles.existingModifiersList}>
                  {modifiers
                    .filter(mod => mod.category_ids.some(catId => modifierCategoryIds.includes(catId)))
                    .map(mod => (
                      <TouchableOpacity 
                        key={mod.id}
                        style={styles.existingModifierItem}
                        onLongPress={() => handleModifierLongPress(mod)}
                      >
                        <Text style={styles.existingModifierName}>{mod.name}</Text>
                        <Text style={styles.existingModifierCost}>+${mod.cost.toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}
                  {modifiers.filter(mod => mod.category_ids.some(catId => modifierCategoryIds.includes(catId))).length === 0 && (
                    <Text style={styles.noModifiersText}>No modifiers yet. Long press to edit.</Text>
                  )}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModifier(false);
                  setModifierName('');
                  setModifierCost('');
                  setModifierCategoryIds([]);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddModifier}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modifier Modal */}
      <Modal visible={showEditModifier} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Modifier</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Modifier Name"
              value={modifierName}
              onChangeText={setModifierName}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Categories (select multiple):</Text>
              <ScrollView horizontal style={styles.categoryPicker}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      modifierCategoryIds.includes(cat.id) && styles.categoryChipSelected,
                    ]}
                    onPress={() => toggleModifierCategorySelection(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      modifierCategoryIds.includes(cat.id) && styles.categoryChipTextSelected,
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Cost"
              value={modifierCost}
              onChangeText={setModifierCost}
              keyboardType="decimal-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteModifier}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditModifier(false);
                  setSelectedModifier(null);
                  setModifierName('');
                  setModifierCost('');
                  setModifierCategoryIds([]);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateModifier}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Customization Modal */}
      <Modal visible={showItemCustomization} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.customizationModal]}>
            <View style={styles.customizationHeader}>
              <Text style={styles.modalTitle}>
                {selectedItemForCustomization?.name}
              </Text>
              <Text style={styles.customizationBasePrice}>
                Base Price: ${selectedItemForCustomization?.price.toFixed(2)}
              </Text>
            </View>

            {/* Modifiers Section */}
            {selectedItemForCustomization && modifiers.filter(m => m.category_ids.includes(selectedItemForCustomization.category_id)).length > 0 && (
              <View style={styles.modifiersSection}>
                <Text style={styles.modifiersSectionTitle}>Select Modifiers:</Text>
                <ScrollView style={styles.modifiersList}>
                  {modifiers
                    .filter(m => m.category_ids.includes(selectedItemForCustomization.category_id))
                    .map(modifier => (
                      <TouchableOpacity
                        key={modifier.id}
                        style={[
                          styles.modifierCheckboxItem,
                          selectedModifiersForItem.includes(modifier.id) && styles.modifierCheckboxItemSelected
                        ]}
                        onPress={() => toggleModifierSelection(modifier.id)}
                      >
                        <View style={styles.modifierCheckboxRow}>
                          <View style={[
                            styles.checkbox,
                            selectedModifiersForItem.includes(modifier.id) && styles.checkboxSelected
                          ]}>
                            {selectedModifiersForItem.includes(modifier.id) && (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            )}
                          </View>
                          <Text style={styles.modifierCheckboxName}>{modifier.name}</Text>
                        </View>
                        <Text style={styles.modifierCheckboxCost}>
                          +${modifier.cost.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantitySectionTitle}>Quantity:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setCustomizationQuantity(Math.max(1, customizationQuantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#4CAF50" />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{customizationQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setCustomizationQuantity(customizationQuantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Total Price */}
            <View style={styles.customizationTotalSection}>
              <Text style={styles.customizationTotalLabel}>Total:</Text>
              <Text style={styles.customizationTotalValue}>
                ${calculateCustomizationTotal().toFixed(2)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowItemCustomization(false);
                  setSelectedItemForCustomization(null);
                  setSelectedModifiersForItem([]);
                  setCustomizationQuantity(1);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, styles.addToCartButton]}
                onPress={addCustomizedItemToCart}
              >
                <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sales Details Modal - With Date Filters */}
      <Modal visible={showSalesDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.salesModalContent]}>
            <Text style={styles.modalTitle}>Sales Details</Text>
            
            {/* Date Filter Buttons */}
            <View style={styles.dateFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.dateFilterButton,
                  salesDateFilter === 'today' && styles.dateFilterButtonActive
                ]}
                onPress={() => {
                  setSalesDateFilter('today');
                  setTimeout(() => loadSalesDetails(), 100);
                }}
              >
                <Text style={[
                  styles.dateFilterText,
                  salesDateFilter === 'today' && styles.dateFilterTextActive
                ]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateFilterButton,
                  salesDateFilter === 'yesterday' && styles.dateFilterButtonActive
                ]}
                onPress={() => {
                  setSalesDateFilter('yesterday');
                  setTimeout(() => loadSalesDetails(), 100);
                }}
              >
                <Text style={[
                  styles.dateFilterText,
                  salesDateFilter === 'yesterday' && styles.dateFilterTextActive
                ]}>Yesterday</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateFilterButton,
                  salesDateFilter === 'week' && styles.dateFilterButtonActive
                ]}
                onPress={() => {
                  setSalesDateFilter('week');
                  setTimeout(() => loadSalesDetails(), 100);
                }}
              >
                <Text style={[
                  styles.dateFilterText,
                  salesDateFilter === 'week' && styles.dateFilterTextActive
                ]}>This Week</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateFilterButton,
                  salesDateFilter === 'custom' && styles.dateFilterButtonActive
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons 
                  name="calendar" 
                  size={16} 
                  color={salesDateFilter === 'custom' ? '#fff' : '#4CAF50'} 
                />
                <Text style={[
                  styles.dateFilterText,
                  salesDateFilter === 'custom' && styles.dateFilterTextActive,
                  { marginLeft: 4 }
                ]}>Custom</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Date Range Picker */}
            {showDatePicker && (
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputRow}>
                  <Text style={styles.dateLabel}>From:</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={customStartDate.toLocaleDateString()}
                    placeholder="Start Date"
                    editable={false}
                  />
                  <TouchableOpacity
                    style={styles.datePickerIcon}
                    onPress={() => {
                      Alert.prompt(
                        'Start Date',
                        'Enter date (MM/DD/YYYY)',
                        (text) => {
                          const date = new Date(text);
                          if (!isNaN(date.getTime())) {
                            setCustomStartDate(date);
                          }
                        }
                      );
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </View>

                <View style={styles.dateInputRow}>
                  <Text style={styles.dateLabel}>To:</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={customEndDate.toLocaleDateString()}
                    placeholder="End Date"
                    editable={false}
                  />
                  <TouchableOpacity
                    style={styles.datePickerIcon}
                    onPress={() => {
                      Alert.prompt(
                        'End Date',
                        'Enter date (MM/DD/YYYY)',
                        (text) => {
                          const date = new Date(text);
                          if (!isNaN(date.getTime())) {
                            setCustomEndDate(date);
                          }
                        }
                      );
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.applyDateButton}
                  onPress={() => {
                    setSalesDateFilter('custom');
                    setShowDatePicker(false);
                    loadSalesDetails();
                  }}
                >
                  <Text style={styles.applyDateButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {salesDetailsReport && (
              <ScrollView style={styles.salesReportScroll}>
                {/* Stats Header - Key Metrics */}
                <View style={styles.statsHeader}>
                  <View style={styles.statCard}>
                    <Ionicons name="cart" size={24} color="#4CAF50" />
                    <Text style={styles.statValue}>{salesDetailsReport.qty_sold || 0}</Text>
                    <Text style={styles.statLabel}>Qty Sold</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="cash" size={24} color="#4CAF50" />
                    <Text style={styles.statValue}>${(salesDetailsReport.total_sales || 0).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Sales</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="return-down-back" size={24} color="#FF5722" />
                    <Text style={[styles.statValue, { color: '#FF5722' }]}>${(salesDetailsReport.return_sales || 0).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Return Sales</Text>
                  </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[styles.filterTab, salesTypeFilter === 'all' && styles.filterTabActive]}
                    onPress={() => {
                      setSalesTypeFilter('all');
                      setTimeout(() => loadSalesDetails(), 100);
                    }}
                  >
                    <Text style={[styles.filterTabText, salesTypeFilter === 'all' && styles.filterTabTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterTab, salesTypeFilter === 'completed' && styles.filterTabActive]}
                    onPress={() => {
                      setSalesTypeFilter('completed');
                      setTimeout(() => loadSalesDetails(), 100);
                    }}
                  >
                    <Text style={[styles.filterTabText, salesTypeFilter === 'completed' && styles.filterTabTextActive]}>Sales Only</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterTab, salesTypeFilter === 'refunded' && styles.filterTabActive]}
                    onPress={() => {
                      setSalesTypeFilter('refunded');
                      setTimeout(() => loadSalesDetails(), 100);
                    }}
                  >
                    <Text style={[styles.filterTabText, salesTypeFilter === 'refunded' && styles.filterTabTextActive]}>Returns Only</Text>
                  </TouchableOpacity>
                </View>

                {/* Transaction List */}
                <Text style={styles.transactionsTitle}>Transactions ({ordersList.length})</Text>
                
                {ordersList.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyStateText}>No transactions found</Text>
                  </View>
                ) : (
                  ordersList.map((order) => {
                    const isExpanded = expandedOrders.includes(order.id);
                    return (
                      <View key={order.id} style={styles.orderCard}>
                        {/* Compact Order Summary */}
                        <TouchableOpacity
                          style={styles.orderSummaryRow}
                          onPress={() => toggleOrderExpanded(order.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.orderSummaryInfo}>
                            <Text style={styles.orderNumber}>#{order.order_number}</Text>
                            <View style={styles.paymentMethodBadge}>
                              <Ionicons 
                                name={order.payment_method === 'cash' ? 'cash' : 'qr-code'} 
                                size={14} 
                                color="#666" 
                              />
                              <Text style={styles.paymentMethodText}>
                                {order.payment_method === 'cash' ? 'Cash' : 'QR Code'}
                              </Text>
                            </View>
                            {order.status === 'refunded' && (
                              <View style={styles.refundedBadgeSmall}>
                                <Text style={styles.refundedBadgeText}>REFUNDED</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.orderSummaryRight}>
                            <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                            <Ionicons 
                              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                              size={24} 
                              color="#4CAF50" 
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded Order Details */}
                        {isExpanded && (
                          <>
                            <View style={styles.orderDivider} />
                            <View style={styles.orderExpandedContent}>
                              <Text style={styles.orderDate}>
                                {new Date(order.created_at).toLocaleString()}
                              </Text>
                              
                              {order.status !== 'refunded' && (
                                <Text style={styles.selectItemsHint}>
                                  Tap items to select for return:
                                </Text>
                              )}
                              
                              {/* Order Items with Checkboxes */}
                              <View style={styles.orderItems}>
                                {order.items.map((item: any, idx: number) => {
                                  const itemKey = `${order.id}-${idx}`;
                                  const isSelected = itemsToReturn.includes(itemKey);
                                  
                                  return (
                                    <TouchableOpacity
                                      key={idx}
                                      style={[
                                        styles.orderItemRow,
                                        order.status !== 'refunded' && styles.orderItemRowSelectable,
                                        isSelected && styles.orderItemRowSelected
                                      ]}
                                      onPress={() => {
                                        if (order.status !== 'refunded') {
                                          if (isSelected) {
                                            setItemsToReturn(itemsToReturn.filter(k => k !== itemKey));
                                          } else {
                                            setItemsToReturn([...itemsToReturn, itemKey]);
                                          }
                                        }
                                      }}
                                      disabled={order.status === 'refunded'}
                                    >
                                      {order.status !== 'refunded' && (
                                        <View style={[
                                          styles.itemCheckbox,
                                          isSelected && styles.itemCheckboxSelected
                                        ]}>
                                          {isSelected && (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                          )}
                                        </View>
                                      )}
                                      
                                      <View style={styles.orderItemInfo}>
                                        <Text style={styles.orderItemName}>{item.name}</Text>
                                        {item.modifiers && item.modifiers.length > 0 && (
                                          <View style={styles.orderItemModifiers}>
                                            {item.modifiers.map((mod: any, midx: number) => (
                                              <Text key={midx} style={styles.orderItemModifierText}>
                                                + {mod.name} (+${mod.cost.toFixed(2)})
                                              </Text>
                                            ))}
                                          </View>
                                        )}
                                        <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                                      </View>
                                      <Text style={styles.orderItemPrice}>
                                        ${(item.price * item.quantity).toFixed(2)}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>

                              {/* Order Actions */}
                              <View style={styles.orderActions}>
                                {order.status !== 'refunded' ? (
                                  <>
                                    <TouchableOpacity
                                      style={[
                                        styles.actionButton,
                                        styles.returnSelectedButton,
                                        itemsToReturn.length === 0 && styles.actionButtonDisabled
                                      ]}
                                      onPress={() => {
                                        if (itemsToReturn.length > 0) {
                                          // Calculate return amount for selected items
                                          let amount = 0;
                                          itemsToReturn.forEach(itemKey => {
                                            // Extract index from itemKey format: "orderId-idx"
                                            const parts = itemKey.split('-');
                                            const idx = parseInt(parts[parts.length - 1]);
                                            const item = order.items[idx];
                                            
                                            if (item) {
                                              const itemTotal = item.price * item.quantity;
                                              const modifiersTotal = (item.modifiers || []).reduce(
                                                (sum: number, mod: any) => sum + mod.cost, 
                                                0
                                              );
                                              amount += itemTotal + modifiersTotal;
                                            }
                                          });
                                          setReturnAmount(amount);
                                          setSelectedOrderForReturn(order);
                                          setReturnType('partial');
                                          setShowReturnConfirm(true);
                                        }
                                      }}
                                      disabled={itemsToReturn.length === 0}
                                    >
                                      <Ionicons name="checkbox" size={16} color={itemsToReturn.length > 0 ? '#fff' : '#ccc'} />
                                      <Text style={[
                                        styles.actionButtonText,
                                        itemsToReturn.length === 0 && styles.actionButtonTextDisabled
                                      ]}>
                                        Return Selected ({itemsToReturn.length})
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={[styles.actionButton, styles.returnFullButton]}
                                      onPress={() => {
                                        setReturnAmount(order.total);
                                        setSelectedOrderForReturn(order);
                                        setReturnType('full');
                                        setItemsToReturn([]);
                                        setShowReturnConfirm(true);
                                      }}
                                    >
                                      <Ionicons name="return-down-back" size={16} color="#fff" />
                                      <Text style={styles.actionButtonText}>Return Full Order</Text>
                                    </TouchableOpacity>
                                  </>
                                ) : null}

                                <TouchableOpacity
                                  style={[styles.actionButton, styles.reprintButton]}
                                  onPress={() => {
                                    // Reprint receipt
                                    const receiptData = {
                                      orderNumber: order.order_number,
                                      items: order.items,
                                      subtotal: order.total,
                                      total: order.total,
                                      paymentMethod: order.payment_method,
                                      salesPerson: order.sales_person,
                                      timestamp: order.created_at,
                                      companyName: companyName || 'GoPos POS',
                                      companyAddress: companyAddress || '',
                                    };
                                    
                                    if (Platform.OS === 'android') {
                                      SunmiPrinter.printReceipt(receiptData);
                                    } else {
                                      printReceipt(receiptData);
                                    }
                                  }}
                                >
                                  <Ionicons name="print" size={16} color="#fff" />
                                  <Text style={styles.actionButtonText}>Reprint</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowSalesDetails(false);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => printSalesReport(salesDetailsReport)}
              >
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={[styles.modalButtonText, { color: '#fff', marginLeft: 8 }]}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Confirmation Modal */}
      <Modal visible={showReturnConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.returnConfirmModal]}>
            <Ionicons name="alert-circle" size={48} color="#FF5722" style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.returnConfirmTitle}>Confirm Return</Text>
            <Text style={styles.returnConfirmText}>
              {returnType === 'full' 
                ? `Return full order #${selectedOrderForReturn?.order_number}?`
                : 'Return selected items?'}
            </Text>
            <Text style={styles.returnConfirmAmount}>
              Amount: ${returnAmount.toFixed(2)}
            </Text>

            <View style={styles.returnConfirmButtons}>
              <TouchableOpacity
                style={[styles.returnConfirmButton, styles.returnConfirmCancel]}
                onPress={() => {
                  setShowReturnConfirm(false);
                  setSelectedOrderForReturn(null);
                  setItemsToReturn([]);
                }}
              >
                <Text style={styles.returnConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.returnConfirmButton, styles.returnConfirmProceed]}
                onPress={async () => {
                  setShowReturnConfirm(false);
                  
                  // Show print confirmation
                  Alert.alert(
                    'Print Return Receipt?',
                    'Would you like to print the return receipt?',
                    [
                      {
                        text: 'No',
                        style: 'cancel',
                        onPress: async () => {
                          await processReturn(false);
                        }
                      },
                      {
                        text: 'Yes, Print',
                        onPress: async () => {
                          await processReturn(true);
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={[styles.returnConfirmButtonText, { color: '#fff' }]}>Confirm Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Day Closing Report Modal - No Date Filters */}
      {/* Sales Report Modal */}
      <Modal visible={showSalesReport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.salesModalContent]}>
            <Text style={styles.modalTitle}>Day Closing Report</Text>
            <Text style={styles.reportSubtitle}>{new Date().toLocaleDateString()}</Text>
            
            {salesReport && (
              <ScrollView style={styles.salesReportScroll}>
                <View style={styles.salesSummary}>
                  <View style={styles.salesRow}>
                    <Text style={styles.salesLabel}>Gross Sales:</Text>
                    <Text style={styles.salesValue}>${salesReport.total_sales.toFixed(2)}</Text>
                  </View>
                  {salesReport.return_sales > 0 && (
                    <View style={styles.salesRow}>
                      <Text style={[styles.salesLabel, { color: '#FF5722' }]}>Return Sales:</Text>
                      <Text style={[styles.salesValue, { color: '#FF5722' }]}>-${salesReport.return_sales.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.salesRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8, marginTop: 8 }]}>
                    <Text style={[styles.salesLabel, { fontWeight: 'bold', fontSize: 16 }]}>Net Sales:</Text>
                    <Text style={[styles.salesValue, { fontWeight: 'bold', fontSize: 16, color: '#4CAF50' }]}>
                      ${(salesReport.total_sales - (salesReport.return_sales || 0)).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.salesRow}>
                    <Text style={styles.salesLabel}>Total Orders:</Text>
                    <Text style={styles.salesValue}>{salesReport.total_orders}</Text>
                  </View>
                  <View style={styles.salesRow}>
                    <Text style={styles.salesLabel}>Cash Sales:</Text>
                    <Text style={styles.salesValue}>${salesReport.cash_sales.toFixed(2)}</Text>
                  </View>
                  <View style={styles.salesRow}>
                    <Text style={styles.salesLabel}>QR Sales:</Text>
                    <Text style={styles.salesValue}>${salesReport.qr_sales.toFixed(2)}</Text>
                  </View>
                  <View style={styles.salesRow}>
                    <Text style={styles.salesLabel}>Total Discount:</Text>
                    <Text style={styles.salesValue}>${salesReport.total_discount.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={styles.topItemsTitle}>Top Items:</Text>
                {salesReport.top_items.map((item: any, index: number) => (
                  <View key={index} style={styles.topItemRow}>
                    <Text style={styles.topItemName}>{item.name}</Text>
                    <View style={styles.topItemStats}>
                      <Text style={styles.topItemQty}>Qty: {item.quantity}</Text>
                      <Text style={styles.topItemRevenue}>${item.revenue.toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowSalesReport(false);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => printSalesReport(salesReport)}
              >
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={[styles.modalButtonText, { color: '#fff', marginLeft: 8 }]}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.modalText}>Settings configuration coming soon...</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Printer Config Modal */}
      <Modal visible={showPrinterConfig} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.printerConfigScroll}>
            <View style={styles.printerConfigContent}>
              {/* Header */}
              <View style={styles.printerHeader}>
                <TouchableOpacity onPress={() => setShowPrinterConfig(false)}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.printerHeaderTitle}>Printer Configuration</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Printer Detection */}
              <View style={styles.printerSection}>
                <Text style={styles.printerSectionTitle}>Printer Device</Text>
                <TouchableOpacity
                  style={styles.detectButton}
                  onPress={detectPrinters}
                  disabled={detectingPrinter}
                >
                  {detectingPrinter ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#fff" />
                      <Text style={styles.detectButtonText}>Detect Printers</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Detected Printers */}
                {printerDevices.length > 0 && (
                  <View style={styles.devicesContainer}>
                    {printerDevices.map((printer) => (
                      <TouchableOpacity
                        key={printer.id}
                        style={[
                          styles.deviceCard,
                          selectedPrinter?.id === printer.id && styles.deviceCardSelected
                        ]}
                        onPress={() => setSelectedPrinter(printer)}
                      >
                        <Ionicons
                          name={printer.type === 'Internal' ? 'print' : printer.type === 'Bluetooth' ? 'bluetooth' : 'wifi'}
                          size={24}
                          color={selectedPrinter?.id === printer.id ? '#4CAF50' : '#666'}
                        />
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName}>{printer.name}</Text>
                          <Text style={styles.deviceType}>{printer.type}</Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Receipt Customization */}
              <View style={styles.printerSection}>
                <Text style={styles.printerSectionTitle}>Receipt Customization</Text>
                
                {/* Logo Upload */}
                <Text style={styles.settingLabel}>Logo</Text>
                <TouchableOpacity style={styles.logoUploadButton} onPress={pickReceiptLogo}>
                  {receiptLogo ? (
                    <Image source={{ uri: receiptLogo }} style={styles.logoPreview} resizeMode="contain" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={32} color="#999" />
                      <Text style={styles.uploadText}>Tap to upload logo</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Company Name */}
                <Text style={styles.settingLabel}>Company Name</Text>
                <TextInput
                  style={styles.settingInput}
                  placeholder="Enter company name"
                  value={companyName}
                  onChangeText={setCompanyName}
                />

                {/* Company Address */}
                <Text style={styles.settingLabel}>Address</Text>
                <TextInput
                  style={[styles.settingInput, { height: 60 }]}
                  placeholder="Enter company address"
                  value={companyAddress}
                  onChangeText={setCompanyAddress}
                  multiline
                  numberOfLines={2}
                />

                {/* Footer Text */}
                <Text style={styles.settingLabel}>Footer Message</Text>
                <TextInput
                  style={[styles.settingInput, { height: 60 }]}
                  placeholder="Enter footer message"
                  value={receiptFooter}
                  onChangeText={setReceiptFooter}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Receipt Preview */}
              <View style={styles.printerSection}>
                <Text style={styles.printerSectionTitle}>Receipt Preview</Text>
                <View style={styles.receiptPreview}>
                  <ScrollView style={styles.receiptScroll}>
                    {receiptLogo && (
                      <Image source={{ uri: receiptLogo }} style={styles.receiptLogo} resizeMode="contain" />
                    )}
                    <Text style={styles.receiptCompanyName}>{companyName || 'Company Name'}</Text>
                    <Text style={styles.receiptAddress}>{companyAddress || 'Company Address'}</Text>
                    <View style={styles.receiptDivider} />
                    
                    <Text style={styles.receiptTitle}>RECEIPT</Text>
                    <Text style={styles.receiptInfo}>Order #: ORD00001</Text>
                    <Text style={styles.receiptInfo}>Date: {new Date().toLocaleString()}</Text>
                    
                    <View style={styles.receiptDivider} />
                    
                    <View style={styles.receiptItemRow}>
                      <Text style={styles.receiptItemText}>Item 1 x2</Text>
                      <Text style={styles.receiptItemText}>$10.00</Text>
                    </View>
                    <View style={styles.receiptItemRow}>
                      <Text style={styles.receiptItemText}>Item 2 x1</Text>
                      <Text style={styles.receiptItemText}>$5.50</Text>
                    </View>
                    
                    <View style={styles.receiptDivider} />
                    
                    <View style={styles.receiptTotalRow}>
                      <Text style={styles.receiptTotalText}>Total:</Text>
                      <Text style={styles.receiptTotalText}>$15.50</Text>
                    </View>
                    
                    <View style={styles.receiptDivider} />
                    
                    <Text style={styles.receiptFooter}>{receiptFooter || 'Thank you!'}</Text>
                  </ScrollView>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.printerActions}>
                <TouchableOpacity
                  style={[styles.printerActionButtonNew, { flex: 1 }]}
                  onPress={testPrint}
                  disabled={!selectedPrinter}
                >
                  <Ionicons name="print-outline" size={20} color="#4CAF50" />
                  <Text style={styles.printerActionTextNew}>Test Print</Text>
                </TouchableOpacity>

                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    style={[styles.printerActionButtonNew, { flex: 1 }]}
                    onPress={testPrinter}
                    disabled={detectingPrinter}
                  >
                    {detectingPrinter ? (
                      <ActivityIndicator size="small" color="#4CAF50" />
                    ) : (
                      <Ionicons name="hardware-chip-outline" size={20} color="#4CAF50" />
                    )}
                    <Text style={styles.printerActionTextNew}>SunMi Test</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.printerSaveButton, { flex: 2 }]}
                  onPress={() => {
                    Alert.alert('Success', 'Printer settings saved');
                    setShowPrinterConfig(false);
                  }}
                >
                  <Text style={styles.printerSaveText}>Save Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* About Us Modal */}
      <Modal visible={showAbout} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>About Us</Text>
            
            <View style={styles.aboutLogoContainer}>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_gopos-app/artifacts/te4zteds_gopos%20green.png' }}
                style={styles.aboutLogo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.modalText}>
              Version 1.0.0
              {'\n\n'}
              Developed by MHK
              {'\n'}
              Main supplier: Posx Solution Co.
              {'\n'}
              Contact: +6738184877
              {'\n\n'}
              A modern point-of-sale system designed for restaurants and food businesses.
              {'\n\n'}
              Features:
              {'\n'}• Multi-client support
              {'\n'}• Real-time inventory
              {'\n'}• Sales reporting
              {'\n'}• Multiple payment methods
              {'\n'}• Receipt printing
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={() => setShowAbout(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={showCheckout} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.checkoutScrollContent}>
            <View style={styles.checkoutModalContent}>
              <Text style={styles.checkoutTitle}>Order Details</Text>
              
              {/* Order Items Summary */}
              <View style={styles.orderSummarySection}>
                {cart.map(item => (
                  <View key={item.item_id} style={styles.summaryItemRow}>
                    <Text style={styles.summaryItemName}>{item.name} x{item.quantity}</Text>
                    <Text style={styles.summaryItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              {/* Price Breakdown */}
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Subtotal:</Text>
                  <Text style={styles.priceValue}>${getSubtotal().toFixed(2)}</Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount (%):</Text>
                  <TextInput
                    style={styles.discountInputSmall}
                    placeholder="0"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.priceValue}>-${getDiscountAmount().toFixed(2)}</Text>
                </View>

                <View style={styles.totalRowCheckout}>
                  <Text style={styles.totalLabelCheckout}>Total:</Text>
                  <Text style={styles.totalAmountCheckout}>${getTotal().toFixed(2)}</Text>
                </View>
              </View>
              
              {/* Payment Method */}
              <Text style={styles.paymentSectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodsRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'cash' && styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Ionicons
                    name="cash"
                    size={28}
                    color={paymentMethod === 'cash' ? '#fff' : '#4CAF50'}
                  />
                  <Text style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === 'cash' && styles.paymentMethodButtonTextActive
                  ]}>Cash</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'qr' && styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod('qr')}
                >
                  <Ionicons
                    name="qr-code"
                    size={28}
                    color={paymentMethod === 'qr' ? '#fff' : '#4CAF50'}
                  />
                  <Text style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === 'qr' && styles.paymentMethodButtonTextActive
                  ]}>QR Code</Text>
                </TouchableOpacity>
              </View>
              
              {/* Cash Payment Details */}
              {paymentMethod === 'cash' && (
                <View style={styles.cashPaymentSection}>
                  {/* Quick Amount Buttons */}
                  <Text style={styles.quickAmountLabel}>Quick Select Amount:</Text>
                  <View style={styles.quickAmountGrid}>
                    {(() => {
                      const total = getTotal();
                      const amounts = [
                        total,
                        Math.ceil(total / 5) * 5,
                        Math.ceil(total / 10) * 10,
                        Math.ceil(total / 20) * 20,
                        Math.ceil(total / 50) * 50,
                        Math.ceil(total / 100) * 100,
                      ].filter((val, idx, arr) => arr.indexOf(val) === idx && val >= total);
                      
                      return amounts.slice(0, 6).map((amount, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.quickAmountButton,
                            cashAmount === amount.toFixed(2) && styles.quickAmountButtonActive
                          ]}
                          onPress={() => setCashAmount(amount.toFixed(2))}
                        >
                          <Text style={[
                            styles.quickAmountButtonText,
                            cashAmount === amount.toFixed(2) && styles.quickAmountButtonTextActive
                          ]}>
                            ${amount.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ));
                    })()}
                  </View>

                  <Text style={styles.orText}>or enter custom amount:</Text>
                  
                  <TextInput
                    style={styles.cashInput}
                    placeholder="Enter Cash Amount"
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    keyboardType="decimal-pad"
                  />
                  {cashAmount && !isNaN(parseFloat(cashAmount)) && (
                    <View style={styles.changeRow}>
                      <Text style={styles.changeLabel}>Change:</Text>
                      <Text style={[
                        styles.changeValue,
                        getChange() < 0 && styles.changeNegative
                      ]}>
                        ${getChange().toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* QR Payment */}
              {paymentMethod === 'qr' && (
                <View style={styles.qrPaymentSection}>
                  {user?.qr_payment_image ? (
                    <View style={styles.qrDisplayContainer}>
                      <Text style={styles.qrLabel}>Scan to Pay:</Text>
                      <Image
                        source={{ uri: user.qr_payment_image }}
                        style={styles.qrCodeImageSmall}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <Text style={styles.noQrText}>QR payment not configured</Text>
                  )}
                </View>
              )}
              
              {/* Action Buttons */}
              <View style={styles.checkoutActions}>
                <TouchableOpacity
                  style={styles.cancelCheckoutButton}
                  onPress={() => {
                    setShowCheckout(false);
                    setPaymentMethod('cash');
                    setCashAmount('');
                    setDiscountPercent('');
                  }}
                >
                  <Text style={styles.cancelCheckoutText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.placeOrderButton}
                  onPress={handleCheckout}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.placeOrderText}>Place Order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
  },
  headerLogo: {
    height: 45,
    width: 160,
    flex: 1,
  },
  logoutButton: {
    padding: 4,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  sidebarWelcome: {
    fontSize: 12,
    color: '#666',
  },
  sidebarCompany: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarItemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  sidebarSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  sidebarSubItemText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
  },
  contentArea: {
    flex: 1,
  },
  categoriesBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 12,
  },
  categoryChipHorizontal: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: '#4CAF50',
  },
  categoryChipTextHorizontal: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  itemsGridNew: {
    padding: 12,
  },
  itemCardNew: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minHeight: 90,
    maxWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemNameNew: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  itemPriceNew: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: '#f44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  drawerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  drawerDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  drawerItemsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerCartItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerItemInfo: {
    marginBottom: 8,
  },
  drawerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  drawerItemPrice: {
    fontSize: 13,
    color: '#666',
  },
  drawerItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerQuantityBtn: {
    backgroundColor: '#4CAF50',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerQuantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  drawerDeleteBtn: {
    marginLeft: 16,
    padding: 4,
  },
  drawerItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  drawerSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  drawerSubtotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  drawerSubtotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  drawerCheckoutButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  drawerCheckoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  drawerCloseButton: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  drawerCloseText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoriesList: {
    flex: 1,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemActive: {
    backgroundColor: '#E8F5E9',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    margin: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  itemsSection: {
    flex: 1,
    padding: 12,
  },
  itemsGrid: {
    paddingVertical: 8,
  },
  itemCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    maxWidth: '48%',
  },
  itemCardContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  itemStock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemStockText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  outOfStock: {
    color: '#f44336',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  cartSection: {
    width: 160,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    padding: 12,
  },
  cartList: {
    flex: 1,
    marginTop: 8,
  },
  cartItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    marginBottom: 4,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  quantityButton: {
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemQuantity: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  aboutLogoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  aboutLogo: {
    height: 120,
    width: 280,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSave: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkoutSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 16,
  },
  checkoutLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  checkoutAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  paymentMethodActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  cashSection: {
    marginBottom: 16,
  },
  changeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  changeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  changeNegative: {
    color: '#f44336',
  },
  qrSection: {
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  reportButton: {
    padding: 4,
    marginRight: 12,
  },
  modalButtonDelete: {
    backgroundColor: '#f44336',
  },
  salesModalContent: {
    maxHeight: '85%',
  },
  salesReportScroll: {
    maxHeight: 400,
  },
  salesSummary: {
    marginBottom: 20,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  salesLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  salesValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  topItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  topItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  topItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topItemQty: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
  },
  topItemRevenue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  discountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  discountLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  discountAmount: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 8,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  checkoutSubtotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  qrDisplayContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  noQrText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  checkoutScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  checkoutModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 700,
  },
  checkoutTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderSummarySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#666',
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  priceBreakdown: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  discountInputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 6,
    textAlign: 'center',
    fontSize: 14,
    marginLeft: 8,
  },
  totalRowCheckout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
    marginTop: 8,
  },
  totalLabelCheckout: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmountCheckout: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  paymentMethodButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  paymentMethodButtonTextActive: {
    color: '#fff',
  },
  cashPaymentSection: {
    marginBottom: 20,
  },
  quickAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickAmountButton: {
    minWidth: '30%',
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  quickAmountButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  quickAmountButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  quickAmountButtonTextActive: {
    color: '#4CAF50',
  },
  orText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  cashInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  qrPaymentSection: {
    marginBottom: 20,
  },
  qrCodeImageSmall: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  checkoutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelCheckoutButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelCheckoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  placeOrderButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  printerConfigScroll: {
    flexGrow: 1,
  },
  printerConfigContent: {
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  printerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  printerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  printerSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 8,
  },
  printerSection: {
    paddingHorizontal: 16,
  },
  printerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  printerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  printerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerIconContainer: {
    marginRight: 12,
  },
  printerOptionText: {
    fontSize: 15,
    color: '#333',
  },
  connectedPrinterInfo: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  connectedNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  connectedBox: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  connectedModel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  connectedPort: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  connectedStatus: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  connectedStatusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  printerActionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  printerActionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
  },
  printSettings: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  pickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  autoOptions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  printerSaveButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  printerSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detectButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginVertical: 12,
    gap: 8,
  },
  detectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  devicesContainer: {
    marginTop: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deviceCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  deviceType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoUploadButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 120,
  },
  logoPreview: {
    width: '100%',
    height: 80,
  },
  uploadText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  receiptPreview: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    maxHeight: 400,
  },
  receiptScroll: {
    maxHeight: 380,
  },
  receiptLogo: {
    width: '100%',
    height: 60,
    marginBottom: 12,
  },
  receiptCompanyName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  receiptAddress: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  receiptDivider: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  receiptInfo: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginBottom: 4,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptItemText: {
    fontSize: 13,
    color: '#333',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  receiptTotalText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptFooter: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  printerActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  printerActionButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    gap: 6,
  },
  printerActionTextNew: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  existingModifiersSection: {
    marginTop: 16,
    marginBottom: 8,
    maxHeight: 200,
  },
  existingModifiersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  existingModifiersList: {
    maxHeight: 160,
  },
  existingModifierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    marginBottom: 6,
  },
  existingModifierName: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  existingModifierCost: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  noModifiersText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  customizationModal: {
    maxHeight: '90%',
    width: '85%',
  },
  customizationHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customizationBasePrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modifiersSection: {
    marginBottom: 16,
    maxHeight: 200,
  },
  modifiersSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  modifiersList: {
    maxHeight: 180,
  },
  modifierCheckboxItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modifierCheckboxItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  modifierCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  modifierCheckboxName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  modifierCheckboxCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
  },
  quantitySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  customizationTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  customizationTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  customizationTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.5,
  },
  modifiersInCart: {
    marginTop: 4,
    marginLeft: 4,
  },
  modifierInCartText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  dateFilterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  dateFilterText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dateFilterTextActive: {
    color: '#fff',
  },
  customDateContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 50,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  datePickerIcon: {
    padding: 8,
  },
  applyDateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  applyDateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#4CAF50',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  orderSummaryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  refundedBadgeSmall: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refundedBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  orderSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orderExpandedContent: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  orderDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectItemsHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  orderItemRowSelectable: {
    borderRadius: 6,
    marginBottom: 4,
  },
  orderItemRowSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  orderItemModifiers: {
    marginTop: 4,
  },
  orderItemModifierText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  orderItemQty: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextDisabled: {
    color: '#ccc',
  },
  returnSelectedButton: {
    backgroundColor: '#FF9800',
  },
  returnFullButton: {
    backgroundColor: '#FF5722',
  },
  reprintButton: {
    backgroundColor: '#2196F3',
    flex: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  returnConfirmModal: {
    width: '80%',
    maxWidth: 400,
  },
  returnConfirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  returnConfirmText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  returnConfirmAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: 20,
  },
  returnConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  returnConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  returnConfirmCancel: {
    backgroundColor: '#e0e0e0',
  },
  returnConfirmProceed: {
    backgroundColor: '#FF5722',
  },
  returnConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
