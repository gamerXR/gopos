import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface OrderItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  returned?: boolean;
}

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  total: number;
  payment_method: string;
  cash_amount?: number;
  change_amount?: number;
  created_at: string;
  created_by: string;
  sales_person_name: string;
  status?: string;
}

export default function SalesDetailsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/');
    } else {
      loadOrders();
    }
  }, [user]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/orders`, {
        headers: getAuthHeaders(),
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load sales details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleReturnItem = async (orderId: string, itemId: string) => {
    Alert.alert(
      'Return Item',
      'Are you sure you want to return this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(
                `${BACKEND_URL}/api/orders/${orderId}/return-item`,
                { items: [{ item_id: itemId }] },
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Item returned successfully');
              await loadOrders();
              // Update selected order
              if (selectedOrder && selectedOrder.id === orderId) {
                const updatedOrder = orders.find(o => o.id === orderId);
                if (updatedOrder) setSelectedOrder(updatedOrder);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to return item');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefundOrder = async (orderId: string) => {
    Alert.alert(
      'Refund Order',
      'Are you sure you want to refund this entire order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(
                `${BACKEND_URL}/api/orders/${orderId}/refund`,
                {},
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Order refunded successfully');
              setShowOrderDetails(false);
              await loadOrders();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to refund order');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={[
        styles.orderCard,
        item.status === 'refunded' && styles.orderCardRefunded,
      ]}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.order_number}</Text>
          <Text style={styles.orderDate}>
            {formatDate(item.created_at)} • {formatTime(item.created_at)}
          </Text>
        </View>
        <View style={styles.orderCardRight}>
          <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
          {item.status === 'refunded' && (
            <View style={styles.refundedBadge}>
              <Text style={styles.refundedBadgeText}>REFUNDED</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.orderCardBody}>
        <View style={styles.orderInfo}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.orderInfoText}>{item.sales_person_name || 'Staff'}</Text>
        </View>
        <View style={styles.orderInfo}>
          <Ionicons
            name={item.payment_method === 'cash' ? 'cash' : 'qr-code'}
            size={16}
            color="#666"
          />
          <Text style={styles.orderInfoText}>
            {item.payment_method === 'cash' ? 'Cash' : 'QR Code'}
          </Text>
        </View>
        <View style={styles.orderInfo}>
          <Ionicons name="basket" size={16} color="#666" />
          <Text style={styles.orderInfoText}>{item.items.length} items</Text>
        </View>
      </View>

      <View style={styles.orderCardFooter}>
        <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
        <Text style={styles.viewDetailsText}>View Details</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Details</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No sales transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.ordersList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrderDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedOrder.order_number}</Text>
                    <Text style={styles.modalSubtitle}>
                      {formatDate(selectedOrder.created_at)} at {formatTime(selectedOrder.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowOrderDetails(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Status Badge */}
                {selectedOrder.status === 'refunded' && (
                  <View style={styles.refundedBanner}>
                    <Ionicons name="alert-circle" size={20} color="#f44336" />
                    <Text style={styles.refundedBannerText}>This order has been refunded</Text>
                  </View>
                )}

                {/* Order Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sales Person:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.sales_person_name || 'Staff'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.payment_method === 'cash' ? 'Cash' : 'QR Code'}
                    </Text>
                  </View>
                </View>

                {/* Items List */}
                <Text style={styles.sectionTitle}>Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.itemRow,
                      item.returned && styles.itemRowReturned,
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[
                          styles.itemName,
                          item.returned && styles.itemNameReturned,
                        ]}>
                          {item.name}
                        </Text>
                        {item.returned && (
                          <Text style={styles.returnedBadge}>Returned</Text>
                        )}
                      </View>
                      <Text style={[
                        styles.itemDetails,
                        item.returned && styles.itemDetailsReturned,
                      ]}>
                        ${item.price.toFixed(2)} × {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[
                        styles.itemTotal,
                        item.returned && styles.itemTotalReturned,
                      ]}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                      {selectedOrder.status !== 'refunded' && !item.returned && (
                        <TouchableOpacity
                          onPress={() => handleReturnItem(selectedOrder.id, item.item_id)}
                          style={styles.returnButton}
                        >
                          <Ionicons name="return-down-back" size={18} color="#FF9800" />
                          <Text style={styles.returnButtonText}>Return</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* Price Summary */}
                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>${selectedOrder.subtotal.toFixed(2)}</Text>
                  </View>
                  
                  {selectedOrder.discount_percentage > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Discount ({selectedOrder.discount_percentage}%):
                      </Text>
                      <Text style={styles.summaryValue}>-${selectedOrder.discount_amount?.toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${selectedOrder.total.toFixed(2)}</Text>
                  </View>

                  {selectedOrder.payment_method === 'cash' && (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Cash Received:</Text>
                        <Text style={styles.summaryValue}>${selectedOrder.cash_amount?.toFixed(2)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Change:</Text>
                        <Text style={styles.summaryValue}>${selectedOrder.change_amount?.toFixed(2)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Action Buttons */}
                {selectedOrder.status !== 'refunded' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.refundButton}
                      onPress={() => handleRefundOrder(selectedOrder.id)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cash-outline" size={20} color="#fff" />
                          <Text style={styles.refundButtonText}>Refund Full Order</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardRefunded: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  orderCardRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  refundedBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  refundedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderCardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  orderInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  orderCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
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
    minHeight: 200,
    width: '95%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  refundedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  refundedBannerText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
    marginLeft: 8,
  },
  detailSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemRowReturned: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemNameReturned: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  itemDetails: {
    fontSize: 13,
    color: '#666',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  itemTotalReturned: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  returnButtonText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  summarySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionButtons: {
    marginTop: 20,
  },
  refundButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  refundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
