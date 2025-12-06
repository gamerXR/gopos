import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://pos-foodbev.emergent.host';

export default function DataSyncScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  useEffect(() => {
    loadLastSyncDate();
  }, []);

  const loadLastSyncDate = async () => {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncDate');
      if (lastSync) {
        setLastSyncDate(lastSync);
      }
    } catch (error) {
      console.error('Error loading last sync date:', error);
    }
  };

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      // Fetch all data to refresh local cache
      const [categoriesRes, itemsRes, ordersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/categories`, { headers: getAuthHeaders() }),
        axios.get(`${BACKEND_URL}/api/items`, { headers: getAuthHeaders() }),
        axios.get(`${BACKEND_URL}/api/orders`, { headers: getAuthHeaders() }),
      ]);

      // Update last sync timestamp
      const syncTimestamp = new Date().toISOString();
      await AsyncStorage.setItem('lastSyncDate', syncTimestamp);
      setLastSyncDate(syncTimestamp);

      Alert.alert(
        'Success',
        `Data synchronized successfully!\n\n` +
        `Categories: ${categoriesRes.data.length}\n` +
        `Items: ${itemsRes.data.length}\n` +
        `Orders: ${ordersRes.data.length}`
      );
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert(
        'Sync Failed',
        error.response?.data?.detail || 'Failed to synchronize data. Please try again.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GoPos Data Sync</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="sync-circle" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.infoTitle}>Synchronize Your Data</Text>
          <Text style={styles.infoText}>
            Sync your data to get the latest updates from the server. This will refresh
            all categories, items, and orders.
          </Text>
        </View>

        {/* Last Sync Info */}
        <View style={styles.syncInfoCard}>
          <View style={styles.syncInfoRow}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <View style={styles.syncInfoText}>
              <Text style={styles.syncInfoLabel}>Last Sync</Text>
              {lastSyncDate ? (
                <Text style={styles.syncInfoValue}>{formatDateTime(lastSyncDate)}</Text>
              ) : (
                <Text style={[styles.syncInfoValue, { color: '#999' }]}>Never synced</Text>
              )}
            </View>
          </View>
        </View>

        {/* Sync Button */}
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={syncData}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sync" size={24} color="#fff" />
              <Text style={styles.syncButtonText}>Sync Data</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpCard}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.helpText}>
            Tap "Sync Data" to fetch the latest information from the server. This is useful
            when data is updated on another device or by other staff members.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>GoPos © 2024</Text>
        <Text style={styles.footerSubtext}>Fast and Easy POS System</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  syncInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  syncInfoText: {
    flex: 1,
  },
  syncInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  syncInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  syncButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
