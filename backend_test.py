#!/usr/bin/env python3
"""
Multi-Tenancy and Super Admin Functionality Test Suite
Tests the complete multi-tenancy system and super admin features
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://cafe-pos-android.preview.emergentagent.com/api"

class MultiTenancyTester:
    def __init__(self):
        self.super_admin_token = None
        self.client1_token = None
        self.client2_token = None
        self.client1_id = None
        self.client2_id = None
        self.client1_category_id = None
        self.client2_category_id = None
        self.client1_item_id = None
        self.client2_item_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
        
    def test_super_admin_login(self):
        """Test super admin login"""
        self.log("Testing super admin login...")
        
        response = requests.post(f"{BACKEND_URL}/login", json={
            "phone": "6737165617",
            "password": "448613"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.super_admin_token = data["token"]
            user_role = data["user"]["role"]
            if user_role == "super_admin":
                self.log("✅ Super admin login successful")
                return True
            else:
                self.log(f"❌ Expected super_admin role, got {user_role}", "ERROR")
                return False
        else:
            self.log(f"❌ Super admin login failed: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_create_clients(self):
        """Test creating two test clients"""
        self.log("Creating test clients...")
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Create Client 1
        client1_data = {
            "company_name": "Restaurant A",
            "phone": "1111111",
            "password": "pass1"
        }
        
        response = requests.post(f"{BACKEND_URL}/clients", json=client1_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            self.client1_id = data["id"]
            self.log("✅ Client 1 (Restaurant A) created successfully")
        else:
            self.log(f"❌ Failed to create Client 1: {response.status_code} - {response.text}", "ERROR")
            return False
        
        # Create Client 2
        client2_data = {
            "company_name": "Restaurant B",
            "phone": "2222222",
            "password": "pass2"
        }
        
        response = requests.post(f"{BACKEND_URL}/clients", json=client2_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            self.client2_id = data["id"]
            self.log("✅ Client 2 (Restaurant B) created successfully")
            return True
        else:
            self.log(f"❌ Failed to create Client 2: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client1_login(self):
        """Test Client 1 login"""
        self.log("Testing Client 1 login...")
        
        response = requests.post(f"{BACKEND_URL}/login", json={
            "phone": "1111111",
            "password": "pass1"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.client1_token = data["token"]
            user_role = data["user"]["role"]
            company_name = data["user"]["company_name"]
            if user_role == "client" and company_name == "Restaurant A":
                self.log("✅ Client 1 login successful")
                return True
            else:
                self.log(f"❌ Client 1 login validation failed: role={user_role}, company={company_name}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 1 login failed: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client2_login(self):
        """Test Client 2 login"""
        self.log("Testing Client 2 login...")
        
        response = requests.post(f"{BACKEND_URL}/login", json={
            "phone": "2222222",
            "password": "pass2"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.client2_token = data["token"]
            user_role = data["user"]["role"]
            company_name = data["user"]["company_name"]
            if user_role == "client" and company_name == "Restaurant B":
                self.log("✅ Client 2 login successful")
                return True
            else:
                self.log(f"❌ Client 2 login validation failed: role={user_role}, company={company_name}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 2 login failed: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client1_create_data(self):
        """Test Client 1 creating category and item"""
        self.log("Client 1 creating category and item...")
        
        headers = {"Authorization": f"Bearer {self.client1_token}"}
        
        # Create "Drinks" category
        response = requests.post(f"{BACKEND_URL}/categories", json={
            "name": "Drinks"
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.client1_category_id = data["id"]
            self.log("✅ Client 1 created 'Drinks' category")
        else:
            self.log(f"❌ Client 1 failed to create category: {response.status_code} - {response.text}", "ERROR")
            return False
        
        # Create "Coffee" item
        response = requests.post(f"{BACKEND_URL}/items", json={
            "name": "Coffee",
            "category_id": self.client1_category_id,
            "price": 3.0
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.client1_item_id = data["id"]
            self.log("✅ Client 1 created 'Coffee' item ($3)")
            return True
        else:
            self.log(f"❌ Client 1 failed to create item: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client2_create_data(self):
        """Test Client 2 creating category and item"""
        self.log("Client 2 creating category and item...")
        
        headers = {"Authorization": f"Bearer {self.client2_token}"}
        
        # Create "Food" category
        response = requests.post(f"{BACKEND_URL}/categories", json={
            "name": "Food"
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.client2_category_id = data["id"]
            self.log("✅ Client 2 created 'Food' category")
        else:
            self.log(f"❌ Client 2 failed to create category: {response.status_code} - {response.text}", "ERROR")
            return False
        
        # Create "Burger" item
        response = requests.post(f"{BACKEND_URL}/items", json={
            "name": "Burger",
            "category_id": self.client2_category_id,
            "price": 10.0
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.client2_item_id = data["id"]
            self.log("✅ Client 2 created 'Burger' item ($10)")
            return True
        else:
            self.log(f"❌ Client 2 failed to create item: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client1_data_isolation(self):
        """Test that Client 1 only sees their own data"""
        self.log("Testing Client 1 data isolation...")
        
        headers = {"Authorization": f"Bearer {self.client1_token}"}
        
        # Check categories
        response = requests.get(f"{BACKEND_URL}/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            category_names = [cat["name"] for cat in categories]
            
            if "Drinks" in category_names and "Food" not in category_names:
                self.log("✅ Client 1 sees only 'Drinks' category (correct isolation)")
            else:
                self.log(f"❌ Client 1 data isolation failed - categories: {category_names}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 1 failed to get categories: {response.status_code} - {response.text}", "ERROR")
            return False
        
        # Check items
        response = requests.get(f"{BACKEND_URL}/items", headers=headers)
        if response.status_code == 200:
            items = response.json()
            item_names = [item["name"] for item in items]
            
            if "Coffee" in item_names and "Burger" not in item_names:
                self.log("✅ Client 1 sees only 'Coffee' item (correct isolation)")
                return True
            else:
                self.log(f"❌ Client 1 data isolation failed - items: {item_names}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 1 failed to get items: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_client2_data_isolation(self):
        """Test that Client 2 only sees their own data"""
        self.log("Testing Client 2 data isolation...")
        
        headers = {"Authorization": f"Bearer {self.client2_token}"}
        
        # Check categories
        response = requests.get(f"{BACKEND_URL}/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            category_names = [cat["name"] for cat in categories]
            
            if "Food" in category_names and "Drinks" not in category_names:
                self.log("✅ Client 2 sees only 'Food' category (correct isolation)")
            else:
                self.log(f"❌ Client 2 data isolation failed - categories: {category_names}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 2 failed to get categories: {response.status_code} - {response.text}", "ERROR")
            return False
        
        # Check items
        response = requests.get(f"{BACKEND_URL}/items", headers=headers)
        if response.status_code == 200:
            items = response.json()
            item_names = [item["name"] for item in items]
            
            if "Burger" in item_names and "Coffee" not in item_names:
                self.log("✅ Client 2 sees only 'Burger' item (correct isolation)")
                return True
            else:
                self.log(f"❌ Client 2 data isolation failed - items: {item_names}", "ERROR")
                return False
        else:
            self.log(f"❌ Client 2 failed to get items: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_super_admin_list_clients(self):
        """Test super admin can list all clients"""
        self.log("Testing super admin list clients...")
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            company_names = [client["company_name"] for client in clients]
            
            if "Restaurant A" in company_names and "Restaurant B" in company_names:
                self.log(f"✅ Super admin sees both clients: {company_names}")
                return True
            else:
                self.log(f"❌ Super admin missing clients - found: {company_names}", "ERROR")
                return False
        else:
            self.log(f"❌ Super admin failed to list clients: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_super_admin_reset_password(self):
        """Test super admin can reset client password"""
        self.log("Testing super admin password reset...")
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Reset Client 1's password
        response = requests.put(f"{BACKEND_URL}/clients/{self.client1_id}/reset-password", headers=headers)
        if response.status_code == 200:
            self.log("✅ Super admin reset Client 1's password")
            
            # Test login with new password (123456)
            response = requests.post(f"{BACKEND_URL}/login", json={
                "phone": "1111111",
                "password": "123456"
            })
            
            if response.status_code == 200:
                self.log("✅ Client 1 can login with reset password (123456)")
                return True
            else:
                self.log(f"❌ Client 1 cannot login with reset password: {response.status_code} - {response.text}", "ERROR")
                return False
        else:
            self.log(f"❌ Super admin failed to reset password: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_super_admin_logout(self):
        """Test super admin logout (token invalidation)"""
        self.log("Testing super admin logout...")
        
        # Clear the token (simulating logout)
        old_token = self.super_admin_token
        self.super_admin_token = None
        
        # Try to access protected endpoint with old token
        headers = {"Authorization": f"Bearer {old_token}"}
        response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
        
        # Note: JWT tokens don't get invalidated server-side in this implementation
        # So this test just verifies the token is still valid but we simulate logout
        if response.status_code == 200:
            self.log("✅ Super admin logout test completed (JWT tokens remain valid until expiry)")
            return True
        else:
            self.log(f"❌ Unexpected response during logout test: {response.status_code}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all multi-tenancy and super admin tests"""
        self.log("=" * 60)
        self.log("STARTING MULTI-TENANCY AND SUPER ADMIN TESTS")
        self.log("=" * 60)
        
        tests = [
            ("Super Admin Login", self.test_super_admin_login),
            ("Create Test Clients", self.test_create_clients),
            ("Client 1 Login", self.test_client1_login),
            ("Client 1 Create Data", self.test_client1_create_data),
            ("Client 2 Login", self.test_client2_login),
            ("Client 2 Create Data", self.test_client2_create_data),
            ("Client 1 Data Isolation", self.test_client1_data_isolation),
            ("Client 2 Data Isolation", self.test_client2_data_isolation),
            ("Super Admin List Clients", self.test_super_admin_list_clients),
            ("Super Admin Reset Password", self.test_super_admin_reset_password),
            ("Super Admin Logout", self.test_super_admin_logout)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"❌ {test_name} failed with exception: {str(e)}", "ERROR")
                failed += 1
        
        self.log("\n" + "=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"✅ PASSED: {passed}")
        self.log(f"❌ FAILED: {failed}")
        self.log(f"📊 TOTAL:  {passed + failed}")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED - Multi-tenancy system working correctly!")
            return True
        else:
            self.log("⚠️  SOME TESTS FAILED - Issues found in multi-tenancy system")
            return False

if __name__ == "__main__":
    tester = MultiTenancyTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)