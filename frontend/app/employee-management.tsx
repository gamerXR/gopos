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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://pos-foodbev.emergent.host';

interface Employee {
  _id: string;
  name: string;
  phone: string;
  role: string;
  created_at: string;
}

export default function EmployeeManagementScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form fields
  const [employeeName, setEmployeeName] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/employees`, {
        headers: getAuthHeaders()
      });
      setEmployees(response.data);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!employeeName.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name');
      return;
    }
    if (!employeePhone.trim()) {
      Alert.alert('Validation Error', 'Please enter phone number');
      return;
    }
    if (!employeePassword.trim()) {
      Alert.alert('Validation Error', 'Please enter password');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/employees`,
        {
          name: employeeName,
          phone: employeePhone,
          password: employeePassword,
        },
        { headers: getAuthHeaders() }
      );

      Alert.alert('Success', 'Employee added successfully');
      setShowAddModal(false);
      setEmployeeName('');
      setEmployeePhone('');
      setEmployeePassword('');
      loadEmployees();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeName(employee.name);
    setEmployeePhone(employee.phone);
    setEmployeePassword(''); // Leave empty, user can update if needed
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    
    if (!employeeName.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name');
      return;
    }

    setSubmitting(true);
    try {
      const updateData: any = {
        name: employeeName,
      };
      
      // Only include password if user entered a new one
      if (employeePassword.trim()) {
        updateData.password = employeePassword;
      }

      await axios.put(
        `${BACKEND_URL}/api/employees/${editingEmployee._id}`,
        updateData,
        { headers: getAuthHeaders() }
      );

      Alert.alert('Success', 'Employee updated successfully');
      setShowEditModal(false);
      setEditingEmployee(null);
      setEmployeeName('');
      setEmployeePhone('');
      setEmployeePassword('');
      loadEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BACKEND_URL}/api/employees/${employeeId}`, {
                headers: getAuthHeaders()
              });
              Alert.alert('Success', 'Employee deleted successfully');
              loadEmployees();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Admin/Client Info Card */}
        <View style={styles.adminCard}>
          <View style={styles.adminCardHeader}>
            <Ionicons name="shield-checkmark" size={28} color="#4CAF50" />
            <Text style={styles.adminCardTitle}>Admin Account</Text>
          </View>
          <View style={styles.adminInfo}>
            <View style={styles.adminInfoRow}>
              <Text style={styles.adminLabel}>Name:</Text>
              <Text style={styles.adminValue}>{user?.name || 'Admin'}</Text>
            </View>
            <View style={styles.adminInfoRow}>
              <Text style={styles.adminLabel}>Client ID:</Text>
              <Text style={styles.adminValue}>{user?.phone || user?._id}</Text>
            </View>
            <View style={styles.adminInfoRow}>
              <Text style={styles.adminLabel}>Company:</Text>
              <Text style={styles.adminValue}>{user?.company_name || 'N/A'}</Text>
            </View>
            <View style={styles.adminInfoRow}>
              <Text style={styles.adminLabel}>Role:</Text>
              <Text style={[styles.adminValue, styles.adminRole]}>Administrator</Text>
            </View>
          </View>
        </View>

        {/* Add Employee Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEmployeeName('');
            setEmployeePhone('');
            setEmployeePassword('');
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
          <Text style={styles.addButtonText}>Add Employee</Text>
        </TouchableOpacity>

        {/* Employee List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No employees yet</Text>
            <Text style={styles.emptySubtext}>Tap the "Add Employee" button to get started</Text>
          </View>
        ) : (
          <View style={styles.employeeList}>
            {employees.map((employee) => (
              <View key={employee._id} style={styles.employeeCard}>
                <View style={styles.employeeIcon}>
                  <Ionicons name="person" size={32} color="#4CAF50" />
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <View style={styles.employeeDetails}>
                    <Ionicons name="call-outline" size={14} color="#666" />
                    <Text style={styles.employeePhone}>{employee.phone}</Text>
                  </View>
                  <View style={styles.employeeDetails}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#666" />
                    <Text style={styles.employeeRole}>{employee.role}</Text>
                  </View>
                </View>
                <View style={styles.employeeActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditEmployee(employee)}
                  >
                    <Ionicons name="create-outline" size={22} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteEmployee(employee._id, employee.name)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Employee Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Employee</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Name Field */}
              <Text style={styles.label}>Employee Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={employeeName}
                onChangeText={setEmployeeName}
                autoCapitalize="words"
              />

              {/* Phone Field */}
              <Text style={styles.label}>Phone Number (Login ID) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={employeePhone}
                onChangeText={setEmployeePhone}
                keyboardType="phone-pad"
              />

              {/* Password Field */}
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                value={employeePassword}
                onChangeText={setEmployeePassword}
                secureTextEntry
              />

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  Employee will use their phone number as ID to login as staff
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, submitting && styles.saveButtonDisabled]}
                  onPress={handleAddEmployee}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Add Employee</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Edit Employee Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Employee</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Name Field */}
              <Text style={styles.label}>Employee Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={employeeName}
                onChangeText={setEmployeeName}
                autoCapitalize="words"
              />

              {/* Phone Field (Read-only) */}
              <Text style={styles.label}>Phone Number (Login ID)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Phone number"
                value={employeePhone}
                editable={false}
              />
              <Text style={styles.helpTextSmall}>Phone number cannot be changed</Text>

              {/* Password Field */}
              <Text style={styles.label}>New Password (Leave blank to keep current)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={employeePassword}
                onChangeText={setEmployeePassword}
                secureTextEntry
              />

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  Update employee name or password. Leave password blank if you don't want to change it.
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, submitting && styles.saveButtonDisabled]}
                  onPress={handleUpdateEmployee}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Employee</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>GoPos © 2024</Text>
        <Text style={styles.footerSubtext}>Employee accounts linked to {user?.company_name || 'your business'}</Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  employeeList: {
    gap: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  employeeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  employeeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  employeePhone: {
    fontSize: 14,
    color: '#666',
  },
  employeeRole: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
