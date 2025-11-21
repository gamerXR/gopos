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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function DashboardScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/');
    } else {
      loadCategories();
      loadItems();
    }
  }, [user]);

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

  const addToCart = (item: Item) => {
    const existingItem = cart.find(cartItem => cartItem.item_id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.item_id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }]);
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

  const getChange = () => {
    const cash = parseFloat(cashAmount) || 0;
    const subtotal = getSubtotal();
    return cash - subtotal;
  };

  const pickQRImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setQrImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart');
      return;
    }

    const subtotal = getSubtotal();

    if (paymentMethod === 'cash') {
      const cash = parseFloat(cashAmount);
      if (!cashAmount || isNaN(cash)) {
        Alert.alert('Invalid Amount', 'Please enter cash amount');
        return;
      }
      if (cash < subtotal) {
        Alert.alert('Insufficient Amount', `Cash amount must be at least $${subtotal.toFixed(2)}`);
        return;
      }
    } else if (paymentMethod === 'qr' && !qrImage) {
      Alert.alert('QR Image Required', 'Please upload QR payment proof');
      return;
    }

    setLoading(true);
    try {
      const orderData: any = {
        items: cart,
        subtotal: subtotal,
        payment_method: paymentMethod,
      };

      if (paymentMethod === 'cash') {
        orderData.cash_amount = parseFloat(cashAmount);
        orderData.change_amount = getChange();
      } else {
        orderData.qr_image = qrImage;
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
      setQrImage(null);
      setCashAmount('');
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
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .order-info { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #4CAF50; color: white; }
            .total { font-size: 18px; font-weight: bold; text-align: right; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>F&B POS Receipt</h1>
          <div class="order-info">
            <p>Order #: ${order.order_number}</p>
            <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
            <p>Payment: ${order.payment_method.toUpperCase()}</p>
          </div>
          <table>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
            ${order.items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total">
            <p>Subtotal: $${order.subtotal.toFixed(2)}</p>
            ${order.payment_method === 'cash' ? `
              <p>Cash: $${order.cash_amount.toFixed(2)}</p>
              <p>Change: $${order.change_amount.toFixed(2)}</p>
            ` : ''}
          </div>
          <div class="footer">
            <p>Thank you for your order!</p>
          </div>
        </body>
      </html>
    `;

    // Print to device's default printer (auto-detect)
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      // Fallback: Just show success even if print fails
      Alert.alert('Note', 'Receipt generated but printer not available');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        onPress: async () => {
          await logout();
          router.replace('/');
        }
      },
    ]);
  };

  const subtotal = getSubtotal();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="restaurant" size={24} color="#fff" />
          <Text style={styles.headerTitle}>F&B POS</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerUser}>{user?.name}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Categories Sidebar */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => setShowAddCategory(true)}>
              <Ionicons name="add-circle" size={28} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.categoriesList}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && styles.categoryItemActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryText,
                !selectedCategory && styles.categoryTextActive,
              ]}>
                All Items
              </Text>
            </TouchableOpacity>
            
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddItem(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Items Grid */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory 
              ? categories.find(c => c.id === selectedCategory)?.name 
              : 'All Items'}
          </Text>
          
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.itemsGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemCard}
                onPress={() => addToCart(item)}
                disabled={item.stock <= 0}
              >
                <View style={styles.itemCardContent}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  <View style={styles.itemStock}>
                    <Ionicons
                      name={item.stock > 0 ? 'cube' : 'close-circle'}
                      size={16}
                      color={item.stock > 0 ? '#4CAF50' : '#f44336'}
                    />
                    <Text style={[
                      styles.itemStockText,
                      item.stock <= 0 && styles.outOfStock,
                    ]}>
                      Stock: {item.stock}
                    </Text>
                  </View>
                </View>
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

        {/* Cart Sidebar */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>Cart</Text>
          
          <ScrollView style={styles.cartList}>
            {cart.map(item => (
              <View key={item.item_id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cartItemPrice}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.cartItemActions}>
                  <TouchableOpacity
                    onPress={() => updateCartQuantity(item.item_id, -1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="remove" size={16} color="#fff" />
                  </TouchableOpacity>
                  
                  <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                  
                  <TouchableOpacity
                    onPress={() => updateCartQuantity(item.item_id, 1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.item_id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.cartItemTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.cartFooter}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal:</Text>
              <Text style={styles.subtotalValue}>${subtotal.toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.checkoutButton, cart.length === 0 && styles.checkoutButtonDisabled]}
              onPress={() => setShowCheckout(true)}
              disabled={cart.length === 0}
            >
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

      {/* Checkout Modal */}
      <Modal visible={showCheckout} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout</Text>
            
            <View style={styles.checkoutSummary}>
              <Text style={styles.checkoutLabel}>Total Amount:</Text>
              <Text style={styles.checkoutAmount}>${subtotal.toFixed(2)}</Text>
            </View>
            
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'cash' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons
                  name="cash"
                  size={24}
                  color={paymentMethod === 'cash' ? '#4CAF50' : '#666'}
                />
                <Text style={styles.paymentMethodText}>Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'qr' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('qr')}
              >
                <Ionicons
                  name="qr-code"
                  size={24}
                  color={paymentMethod === 'qr' ? '#4CAF50' : '#666'}
                />
                <Text style={styles.paymentMethodText}>QR Code</Text>
              </TouchableOpacity>
            </View>
            
            {paymentMethod === 'qr' && (
              <View style={styles.qrSection}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickQRImage}
                >
                  <Ionicons name="cloud-upload" size={24} color="#4CAF50" />
                  <Text style={styles.uploadButtonText}>
                    {qrImage ? 'QR Image Uploaded' : 'Upload QR Payment Proof'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCheckout(false);
                  setPaymentMethod('cash');
                  setQrImage(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    Place Order
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUser: {
    color: '#fff',
    marginRight: 12,
    fontSize: 14,
  },
  logoutButton: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  categoriesSection: {
    width: 120,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
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
});
