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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client {
  id: string;
  company_name: string;
  phone: string;
  qr_payment_image: string;
  created_at: string;
}

export default function AdminDashboardScreen() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/backup/create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', `Backup created: ${response.data.filename}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || user.role !== 'super_admin') {
      router.replace('/');
    } else {
      loadClients();
    }
  }, [user, isLoading]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  const loadClients = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/clients`, {
        headers: getAuthHeaders(),
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
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

  const handleAddClient = async () => {
    if (!companyName.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/clients`,
        {
          company_name: companyName,
          phone: phone,
          password: password,
          qr_payment_image: qrImage,
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Client created successfully');
      setCompanyName('');
      setPhone('');
      setPassword('');
      setQrImage(null);
      setShowAddClient(false);
      loadClients();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create client';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setCompanyName(client.company_name);
    setPhone(client.phone);
    setQrImage(client.qr_payment_image);
    setShowEditClient(true);
  };

  const handleUpdateClient = async () => {
    if (!selectedClient || !companyName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${BACKEND_URL}/api/clients/${selectedClient.id}`,
        {
          company_name: companyName,
          phone: phone,
          qr_payment_image: qrImage,
        },
        { headers: getAuthHeaders() }
      );
      Alert.alert('Success', 'Client updated successfully');
      setCompanyName('');
      setPhone('');
      setQrImage(null);
      setSelectedClient(null);
      setShowEditClient(false);
      loadClients();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update client';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;

    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${selectedClient.company_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${BACKEND_URL}/api/clients/${selectedClient.id}`,
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Client deleted successfully');
              setSelectedClient(null);
              setShowEditClient(false);
              loadClients();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete client');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = (client: Client) => {
    Alert.alert(
      'Reset Password',
      `Reset password for "${client.company_name}" to default (123456)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.put(
                `${BACKEND_URL}/api/clients/${client.id}/reset-password`,
                {},
                { headers: getAuthHeaders() }
              );
              Alert.alert('Success', 'Password reset to 123456');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to reset password');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Super Admin</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerUser}>{user?.name}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Client Management</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.addButton, { marginRight: 12, backgroundColor: '#FF9800' }]}
              onPress={handleCreateBackup}
            >
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create Backup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddClient(true)}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add Client</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={clients}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.clientList}
          renderItem={({ item }) => (
            <View style={styles.clientCard}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.company_name}</Text>
                <Text style={styles.clientPhone}>Phone: {item.phone}</Text>
                {item.qr_payment_image && (
                  <Text style={styles.clientQR}>QR Payment: Configured</Text>
                )}
              </View>
              <View style={styles.clientActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditClient(item)}
                >
                  <Ionicons name="create" size={20} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleResetPassword(item)}
                >
                  <Ionicons name="key" size={20} color="#FF9800" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No clients yet</Text>
            </View>
          }
        />
      </View>

      {/* Add Client Modal */}
      <Modal visible={showAddClient} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Client</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.uploadButton} onPress={pickQRImage}>
                <Ionicons name="qr-code" size={24} color="#4CAF50" />
                <Text style={styles.uploadButtonText}>
                  {qrImage ? 'QR Image Uploaded' : 'Upload QR Payment Image (Optional)'}
                </Text>
              </TouchableOpacity>

              {qrImage && (
                <Image source={{ uri: qrImage }} style={styles.qrPreview} />
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowAddClient(false);
                    setCompanyName('');
                    setPhone('');
                    setPassword('');
                    setQrImage(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleAddClient}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Client Modal */}
      <Modal visible={showEditClient} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Client</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity style={styles.uploadButton} onPress={pickQRImage}>
                <Ionicons name="qr-code" size={24} color="#4CAF50" />
                <Text style={styles.uploadButtonText}>
                  {qrImage ? 'QR Image Uploaded' : 'Upload QR Payment Image (Optional)'}
                </Text>
              </TouchableOpacity>

              {qrImage && (
                <Image source={{ uri: qrImage }} style={styles.qrPreview} />
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={handleDeleteClient}
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
                    setShowEditClient(false);
                    setSelectedClient(null);
                    setCompanyName('');
                    setPhone('');
                    setQrImage(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleUpdateClient}
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
    backgroundColor: '#FF9800',
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
  content: {
    flex: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  clientList: {
    paddingBottom: 20,
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientQR: {
    fontSize: 12,
    color: '#4CAF50',
  },
  clientActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  qrPreview: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 8,
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
  modalButtonDelete: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
