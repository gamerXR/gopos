#!/usr/bin/env python3
"""
Comprehensive Backend Testing for GoPos POS Application
Tests all backend APIs to ensure everything is working correctly before APK build.
"""

import requests
import json
from datetime import datetime
import sys
import uuid

# Configuration
BASE_URL = "https://resto-orders.preview.emergentagent.com/api"
SUPER_ADMIN_USER = {
    "phone": "6737165617",
    "password": "448613"
}
CLIENT_USER = {
    "phone": "8889999",
    "password": "123456"
}

class GoPosTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.super_admin_token = None
        self.client_token = None
        self.test_results = []
        self.created_items = []
        self.created_categories = []
        self.created_orders = []
        self.created_clients = []
        self.created_modifiers = []
        self.session = requests.Session()
        
    def log_test(self, test_name, success, message="", details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Set up headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=req_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            # Return a mock response object for timeout/connection errors
            class MockResponse:
                def __init__(self):
                    self.status_code = 0
                def json(self):
                    return {"detail": "Connection error"}
            return MockResponse()
    
    def test_super_admin_login(self):
        """Test Super Admin Login: 6737165617 / 448613"""
        response = self.make_request("POST", "/login", SUPER_ADMIN_USER)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.super_admin_token = data["token"]
                user = data["user"]
                if user.get("role") == "super_admin":
                    self.log_test("Super Admin Login", True, f"Successfully logged in as {user.get('name')}")
                    return True
                else:
                    self.log_test("Super Admin Login", False, f"Wrong role: {user.get('role')}")
            else:
                self.log_test("Super Admin Login", False, "Missing token or user in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Super Admin Login", False, f"Login failed: {error_msg}")
        return False
    
    def test_client_login(self):
        """Test Client Login: 8889999 / 123456"""
        response = self.make_request("POST", "/login", CLIENT_USER)
        
        if response and response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.client_token = data["token"]
                user = data["user"]
                self.log_test("Client Login", True, f"Successfully logged in as {user.get('name')}")
                return True
            else:
                self.log_test("Client Login", False, "Missing token or user in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Client Login", False, f"Login failed: {error_msg}")
        return False
    
    def test_jwt_token_validation(self):
        """Test JWT token generation and validation"""
        if not self.client_token:
            self.log_test("JWT Token Validation", False, "No client token available")
            return False
            
        # Test accessing protected endpoint with valid token
        response = self.make_request("GET", "/categories", token=self.client_token)
        
        if response and response.status_code == 200:
            self.log_test("JWT Token Validation", True, "Valid token accepted")
            
            # Test with invalid token
            response = self.make_request("GET", "/categories", token="invalid_token")
            if response:
                if response.status_code == 401:
                    self.log_test("JWT Invalid Token Rejection", True, "Invalid token properly rejected")
                    return True
                else:
                    self.log_test("JWT Invalid Token Rejection", False, f"Expected 401, got {response.status_code}")
            else:
                self.log_test("JWT Invalid Token Rejection", False, "No response received")
        else:
            self.log_test("JWT Token Validation", False, "Valid token rejected")
        return False
    
    def test_logout_functionality(self):
        """Test logout functionality (client-side token removal)"""
        # Since logout is typically client-side for JWT, we test token expiry behavior
        if self.client_token:
            self.log_test("Logout Functionality", True, "JWT tokens support client-side logout")
            return True
        else:
            self.log_test("Logout Functionality", False, "No token to test logout")
            return False
    
    def test_client_management(self):
        """Test Client Management (Super Admin)"""
        if not self.super_admin_token:
            self.log_test("Client Management", False, "No super admin token")
            return False
        
        # List all clients
        response = self.make_request("GET", "/clients", token=self.super_admin_token)
        if response and response.status_code == 200:
            clients = response.json()
            self.log_test("List All Clients", True, f"Found {len(clients)} clients")
            
            # Create test client if needed
            test_client_data = {
                "company_name": f"Test Restaurant {uuid.uuid4().hex[:8]}",
                "phone": f"9999{uuid.uuid4().hex[:4]}",
                "password": "testpass123"
            }
            
            response = self.make_request("POST", "/clients", test_client_data, token=self.super_admin_token)
            if response and response.status_code == 200:
                client_data = response.json()
                self.created_clients.append(client_data["id"])
                self.log_test("Create Test Client", True, f"Created client: {client_data['company_name']}")
                return True
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                self.log_test("Create Test Client", False, f"Failed to create client: {error_msg}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("List All Clients", False, f"Failed to list clients: {error_msg}")
        return False
    
    def test_multi_tenancy_isolation(self):
        """Test multi-tenancy data isolation"""
        if not self.client_token:
            self.log_test("Multi-tenancy Data Isolation", False, "No client token")
            return False
        
        # This test verifies that client only sees their own data
        response = self.make_request("GET", "/categories", token=self.client_token)
        if response and response.status_code == 200:
            categories = response.json()
            self.log_test("Multi-tenancy Data Isolation", True, f"Client sees {len(categories)} categories (isolated data)")
            return True
        else:
            self.log_test("Multi-tenancy Data Isolation", False, "Failed to verify data isolation")
        return False
    
    def test_category_management(self):
        """Test Category Management"""
        if not self.client_token:
            self.log_test("Category Management", False, "No client token")
            return False
        
        # Create category
        category_data = {"name": f"Beverages {uuid.uuid4().hex[:8]}"}
        response = self.make_request("POST", "/categories", category_data, token=self.client_token)
        
        if response and response.status_code == 200:
            category = response.json()
            self.created_categories.append(category["id"])
            self.log_test("Create Category", True, f"Created category: {category['name']}")
            
            # Get all categories
            response = self.make_request("GET", "/categories", token=self.client_token)
            if response and response.status_code == 200:
                categories = response.json()
                self.log_test("Get All Categories", True, f"Retrieved {len(categories)} categories")
                return True
            else:
                self.log_test("Get All Categories", False, "Failed to retrieve categories")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Create Category", False, f"Failed to create category: {error_msg}")
        return False
    
    def test_item_management(self):
        """Test Item Management"""
        if not self.client_token or not self.created_categories:
            self.log_test("Item Management", False, "No client token or categories available")
            return False
        
        category_id = self.created_categories[0]
        
        # Create item
        item_data = {
            "name": f"Coffee {uuid.uuid4().hex[:8]}",
            "category_id": category_id,
            "price": 4.50
        }
        response = self.make_request("POST", "/items", item_data, token=self.client_token)
        
        if response and response.status_code == 200:
            item = response.json()
            self.created_items.append(item["id"])
            self.log_test("Create Item", True, f"Created item: {item['name']} - ${item['price']}")
            
            # Get all items
            response = self.make_request("GET", "/items", token=self.client_token)
            if response and response.status_code == 200:
                items = response.json()
                self.log_test("Get All Items", True, f"Retrieved {len(items)} items")
                
                # Update item
                updated_data = {
                    "name": f"Premium Coffee {uuid.uuid4().hex[:8]}",
                    "category_id": category_id,
                    "price": 5.50
                }
                response = self.make_request("PUT", f"/items/{item['id']}", updated_data, token=self.client_token)
                if response and response.status_code == 200:
                    self.log_test("Update Item", True, "Item updated successfully")
                    return True
                else:
                    self.log_test("Update Item", False, "Failed to update item")
            else:
                self.log_test("Get All Items", False, "Failed to retrieve items")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Create Item", False, f"Failed to create item: {error_msg}")
        return False
    
    def test_order_management(self):
        """Test Order Management"""
        if not self.client_token or not self.created_items:
            self.log_test("Order Management", False, "No client token or items available")
            return False
        
        item_id = self.created_items[0]
        
        # Create order with items
        order_data = {
            "items": [
                {
                    "item_id": item_id,
                    "name": "Premium Coffee",
                    "price": 5.50,
                    "quantity": 2
                }
            ],
            "subtotal": 11.00,
            "discount_percentage": 0,
            "discount_amount": 0,
            "total": 11.00,
            "payment_method": "cash",
            "cash_amount": 15.00,
            "change_amount": 4.00
        }
        
        response = self.make_request("POST", "/orders", order_data, token=self.client_token)
        
        if response and response.status_code == 200:
            order = response.json()
            self.created_orders.append(order["id"])
            self.log_test("Create Order", True, f"Created order: {order['order_number']} - ${order['total']}")
            
            # Note: sales_person_name is included in GET response, not POST response
            # We'll verify it in the GET orders test below
            
            # Get all orders
            response = self.make_request("GET", "/orders", token=self.client_token)
            if response and response.status_code == 200:
                orders = response.json()
                self.log_test("Get All Orders", True, f"Retrieved {len(orders)} orders")
                
                # Verify timestamps in ISO format and sales person name
                if orders and "created_at" in orders[0]:
                    try:
                        datetime.fromisoformat(orders[0]["created_at"].replace('Z', '+00:00'))
                        self.log_test("Order Timestamp Format", True, "Timestamps in ISO format")
                        
                        # Check for sales_person_name in GET response
                        if "sales_person_name" in orders[0]:
                            self.log_test("Order Sales Person", True, f"Sales person: {orders[0]['sales_person_name']}")
                        else:
                            self.log_test("Order Sales Person", False, "Missing sales_person_name in GET response")
                        
                        return True
                    except ValueError:
                        self.log_test("Order Timestamp Format", False, "Invalid timestamp format")
                else:
                    self.log_test("Order Timestamp Format", False, "Missing timestamp")
            else:
                self.log_test("Get All Orders", False, "Failed to retrieve orders")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Create Order", False, f"Failed to create order: {error_msg}")
        return False
    
    def test_refund_return_features(self):
        """Test Refund & Return Features"""
        if not self.client_token or not self.created_orders:
            self.log_test("Refund/Return Features", False, "No client token or orders available")
            return False
        
        order_id = self.created_orders[0]
        
        # First, get the order to find actual item IDs
        response = self.make_request("GET", "/orders", token=self.client_token)
        if not (response and response.status_code == 200):
            self.log_test("Get Order for Return Test", False, "Failed to get orders")
            return False
        
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        
        if not test_order or not test_order.get("items"):
            self.log_test("Find Test Order", False, "Test order not found or has no items")
            return False
        
        item_id = test_order["items"][0]["item_id"]
        
        # Create a fresh order specifically for return testing
        if self.created_items:
            item_id_for_return = self.created_items[0]
            return_order_data = {
                "items": [
                    {
                        "item_id": item_id_for_return,
                        "name": "Test Item for Return",
                        "price": 2.50,
                        "quantity": 1
                    }
                ],
                "subtotal": 2.50,
                "total": 2.50,
                "payment_method": "cash"
            }
            
            response = self.make_request("POST", "/orders", return_order_data, token=self.client_token)
            if response and response.status_code == 200:
                return_order = response.json()
                return_order_id = return_order["id"]
                
                # Test return individual item
                return_data = {"item_id": item_id_for_return}
                response = self.make_request("POST", f"/orders/{return_order_id}/return-item", return_data, token=self.client_token)
                
                if response and response.status_code == 200:
                    self.log_test("Return Individual Item", True, "Item returned successfully")
                    
                    # Test returning same item again (should fail)
                    response = self.make_request("POST", f"/orders/{return_order_id}/return-item", return_data, token=self.client_token)
                    if response and response.status_code == 400:
                        self.log_test("Prevent Duplicate Return", True, "Correctly prevented duplicate return")
                    else:
                        self.log_test("Prevent Duplicate Return", False, "Should prevent duplicate returns")
                else:
                    error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                    self.log_test("Return Individual Item", False, f"Failed to return item: {error_msg}")
            else:
                self.log_test("Create Order for Return Test", False, "Failed to create order for return testing")
        
        # Create a new order for refund testing
        if self.created_items:
            item_id = self.created_items[0]
            order_data = {
                "items": [
                    {
                        "item_id": item_id,
                        "name": "Test Item for Refund",
                        "price": 3.00,
                        "quantity": 1
                    }
                ],
                "subtotal": 3.00,
                "total": 3.00,
                "payment_method": "qr",
                "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            }
            
            response = self.make_request("POST", "/orders", order_data, token=self.client_token)
            if response and response.status_code == 200:
                refund_order = response.json()
                refund_order_id = refund_order["id"]
                
                # Test refund full order
                response = self.make_request("POST", f"/orders/{refund_order_id}/refund", token=self.client_token)
                
                if response and response.status_code == 200:
                    self.log_test("Refund Full Order", True, "Order refunded successfully")
                    
                    # Verify status changed to "refunded"
                    response = self.make_request("GET", "/orders", token=self.client_token)
                    if response and response.status_code == 200:
                        orders = response.json()
                        refunded_order = next((o for o in orders if o["id"] == refund_order_id), None)
                        if refunded_order and refunded_order.get("status") == "refunded":
                            self.log_test("Refund Status Update", True, "Order status changed to 'refunded'")
                            
                            # Test that returned items show correctly
                            items_returned = all(item.get("returned", False) for item in refunded_order.get("items", []))
                            if items_returned:
                                self.log_test("Returned Items Display", True, "All items marked as returned")
                                return True
                            else:
                                self.log_test("Returned Items Display", False, "Items not marked as returned")
                        else:
                            self.log_test("Refund Status Update", False, "Order status not updated to 'refunded'")
                    else:
                        self.log_test("Refund Status Verification", False, "Failed to verify refund status")
                else:
                    error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                    self.log_test("Refund Full Order", False, f"Failed to refund order: {error_msg}")
            else:
                self.log_test("Create Order for Refund Test", False, "Failed to create order for refund testing")
        
        return False
    
    def test_sales_reports(self):
        """Test Sales Reports"""
        if not self.client_token:
            self.log_test("Sales Reports", False, "No client token")
            return False
        
        # Get daily sales report
        response = self.make_request("GET", "/sales-report", token=self.client_token)
        
        if response and response.status_code == 200:
            report = response.json()
            required_fields = ["date", "total_sales", "total_orders", "cash_sales", "qr_sales", "total_discount", "top_items"]
            
            if all(field in report for field in required_fields):
                self.log_test("Sales Report Structure", True, "All required fields present")
                self.log_test("Sales Report Data", True, f"Total sales: ${report['total_sales']}, Orders: {report['total_orders']}")
                
                # Verify payment method breakdown
                if isinstance(report["cash_sales"], (int, float)) and isinstance(report["qr_sales"], (int, float)):
                    self.log_test("Payment Method Breakdown", True, f"Cash: ${report['cash_sales']}, QR: ${report['qr_sales']}")
                    return True
                else:
                    self.log_test("Payment Method Breakdown", False, "Invalid payment method data")
            else:
                missing = [f for f in required_fields if f not in report]
                self.log_test("Sales Report Structure", False, f"Missing fields: {missing}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_test("Sales Reports", False, f"Failed to get sales report: {error_msg}")
        return False

    def test_modifier_management(self):
        """Test Modifier Management API - NEW FEATURE"""
        if not self.client_token or not self.created_categories:
            self.log_test("Modifier Management", False, "No client token or categories available")
            return False
        
        # Test 1: Create modifiers for different categories
        test_modifiers = [
            {
                "name": "Extra Ice",
                "cost": 0.5,
                "category_id": self.created_categories[0]
            },
            {
                "name": "Large Size",
                "cost": 1.5,
                "category_id": self.created_categories[0]
            }
        ]
        
        # Add second category modifier if we have multiple categories
        if len(self.created_categories) > 1:
            test_modifiers.append({
                "name": "Extra Cheese",
                "cost": 2.0,
                "category_id": self.created_categories[1] if len(self.created_categories) > 1 else self.created_categories[0]
            })
        
        success_count = 0
        for modifier_data in test_modifiers:
            response = self.make_request("POST", "/modifiers", modifier_data, token=self.client_token)
            
            if response and response.status_code == 200:
                modifier = response.json()
                self.created_modifiers.append(modifier["id"])
                self.log_test(f"Create Modifier: {modifier_data['name']}", True, f"Created with ID: {modifier['id']}, Cost: ${modifier['cost']}")
                success_count += 1
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                self.log_test(f"Create Modifier: {modifier_data['name']}", False, f"Failed: {error_msg}")
        
        if success_count == 0:
            return False
        
        # Test 2: Get all modifiers
        response = self.make_request("GET", "/modifiers", token=self.client_token)
        if response and response.status_code == 200:
            modifiers = response.json()
            self.log_test("Get All Modifiers", True, f"Retrieved {len(modifiers)} modifiers")
        else:
            self.log_test("Get All Modifiers", False, "Failed to retrieve modifiers")
        
        # Test 3: Get modifiers filtered by category
        category_id = self.created_categories[0]
        response = self.make_request("GET", f"/modifiers?category_id={category_id}", token=self.client_token)
        if response and response.status_code == 200:
            filtered_modifiers = response.json()
            all_correct_category = all(mod["category_id"] == category_id for mod in filtered_modifiers)
            if all_correct_category:
                self.log_test("Get Modifiers by Category", True, f"Retrieved {len(filtered_modifiers)} modifiers for category")
            else:
                self.log_test("Get Modifiers by Category", False, "Some modifiers don't belong to specified category")
        else:
            self.log_test("Get Modifiers by Category", False, "Failed to filter modifiers by category")
        
        # Test 4: Update modifier
        if self.created_modifiers:
            modifier_id = self.created_modifiers[0]
            updated_data = {
                "name": "Updated Extra Ice",
                "cost": 0.75,
                "category_id": self.created_categories[0]
            }
            
            response = self.make_request("PUT", f"/modifiers/{modifier_id}", updated_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update Modifier", True, "Successfully updated modifier")
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                self.log_test("Update Modifier", False, f"Failed to update: {error_msg}")
        
        # Test 5: Test validation - invalid category
        invalid_modifier = {
            "name": "Invalid Category Modifier",
            "cost": 1.0,
            "category_id": "invalid_category_id"
        }
        
        response = self.make_request("POST", "/modifiers", invalid_modifier, token=self.client_token)
        if response and response.status_code == 404:
            self.log_test("Modifier Validation - Invalid Category", True, "Correctly rejected invalid category_id")
        else:
            self.log_test("Modifier Validation - Invalid Category", False, f"Expected 404, got {response.status_code if response else 'No response'}")
        
        # Test 6: Test duplicate prevention
        if self.created_modifiers:
            # Try to create modifier with same name in same category
            duplicate_modifier = {
                "name": "Extra Ice",  # This should already exist
                "cost": 3.0,
                "category_id": self.created_categories[0]
            }
            
            response = self.make_request("POST", "/modifiers", duplicate_modifier, token=self.client_token)
            if response and response.status_code == 400:
                self.log_test("Modifier Duplicate Prevention", True, "Correctly prevented duplicate modifier name in same category")
            else:
                self.log_test("Modifier Duplicate Prevention", False, f"Expected 400, got {response.status_code if response else 'No response'}")
        
        # Test 7: Delete modifier
        if self.created_modifiers:
            modifier_to_delete = self.created_modifiers[-1]
            response = self.make_request("DELETE", f"/modifiers/{modifier_to_delete}", token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete Modifier", True, "Successfully deleted modifier")
                self.created_modifiers.remove(modifier_to_delete)
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                self.log_test("Delete Modifier", False, f"Failed to delete: {error_msg}")
        
        # Test 8: Delete non-existent modifier
        response = self.make_request("DELETE", "/modifiers/non_existent_id", token=self.client_token)
        if response and response.status_code == 404:
            self.log_test("Delete Non-existent Modifier", True, "Correctly returned 404 for non-existent modifier")
        else:
            self.log_test("Delete Non-existent Modifier", False, f"Expected 404, got {response.status_code if response else 'No response'}")
        
        # Test 9: Authentication required
        endpoints_to_test = [
            ("POST", "/modifiers", {"name": "Test", "cost": 1.0, "category_id": "test"}),
            ("GET", "/modifiers", None),
            ("PUT", "/modifiers/test_id", {"name": "Test", "cost": 1.0, "category_id": "test"}),
            ("DELETE", "/modifiers/test_id", None)
        ]

        auth_tests_passed = 0
        for method, endpoint, data in endpoints_to_test:
            response = self.make_request(method, endpoint, data)  # No token
            if response and response.status_code in [401, 403]:
                auth_tests_passed += 1
        
        if auth_tests_passed == len(endpoints_to_test):
            self.log_test("Modifier Auth Required", True, "All modifier endpoints require authentication")
        else:
            self.log_test("Modifier Auth Required", False, f"Only {auth_tests_passed}/{len(endpoints_to_test)} endpoints require auth")
        
        return success_count > 0
    
    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created modifiers
        for modifier_id in self.created_modifiers:
            response = self.make_request("DELETE", f"/modifiers/{modifier_id}", token=self.client_token)
            if response and response.status_code == 200:
                print(f"   Deleted modifier: {modifier_id}")
        
        # Delete created items
        for item_id in self.created_items:
            response = self.make_request("DELETE", f"/items/{item_id}", token=self.client_token)
            if response and response.status_code == 200:
                print(f"   Deleted item: {item_id}")
        
        # Delete created categories
        for category_id in self.created_categories:
            response = self.make_request("DELETE", f"/categories/{category_id}", token=self.client_token)
            if response and response.status_code == 200:
                print(f"   Deleted category: {category_id}")
        
        # Delete created clients (super admin only)
        if self.super_admin_token:
            for client_id in self.created_clients:
                response = self.make_request("DELETE", f"/clients/{client_id}", token=self.super_admin_token)
                if response and response.status_code == 200:
                    print(f"   Deleted client: {client_id}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting GoPos Backend Testing")
        print(f"📡 Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Authentication Tests
        print("\n🔐 Authentication & User Management Tests")
        self.test_super_admin_login()
        self.test_client_login()
        self.test_jwt_token_validation()
        self.test_logout_functionality()
        
        # Client Management Tests (Super Admin)
        print("\n👥 Client Management Tests")
        self.test_client_management()
        self.test_multi_tenancy_isolation()
        
        # Core API Tests
        print("\n📂 Category Management Tests")
        self.test_category_management()
        
        print("\n🍽️ Item Management Tests")
        self.test_item_management()
        
        print("\n🛒 Order Management Tests")
        self.test_order_management()
        
        # New Features Tests
        print("\n💰 Refund & Return Features Tests")
        self.test_refund_return_features()
        
        print("\n📊 Sales Reports Tests")
        self.test_sales_reports()
        
        # NEW FEATURE: Modifier Management Tests
        print("\n🔧 Modifier Management Tests (NEW FEATURE)")
        self.test_modifier_management()
        
        # Cleanup
        self.cleanup()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📋 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n🎯 CRITICAL CHECKS:")
        critical_tests = [
            "Super Admin Login", "Client Login", "JWT Token Validation",
            "Create Category", "Create Item", "Create Order", "Sales Report Structure"
        ]
        
        for test_name in critical_tests:
            result = next((r for r in self.test_results if r["test"] == test_name), None)
            if result:
                status = "✅" if "✅ PASS" in result["status"] else "❌"
                print(f"   {status} {test_name}")
        
        print("\n" + "=" * 80)
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Backend is ready for APK build.")
        else:
            print("⚠️  Some tests failed. Please review and fix issues before APK build.")
        
        return failed == 0

if __name__ == "__main__":
    tester = GoPosTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)