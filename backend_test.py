#!/usr/bin/env python3
"""
Backend API Testing for F&B POS System
Testing new features: Enhanced Order Model, Return Item API, Refund Order API
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://gopos-app.preview.emergentagent.com/api"
TEST_USER = {
    "phone": "8889999",
    "password": "123456"
}

class BackendTester:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def login(self):
        """Login and get JWT token"""
        try:
            response = self.session.post(f"{BASE_URL}/login", json=TEST_USER)
            if response.status_code == 200:
                data = response.json()
                self.token = data["token"]
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                self.log_test("User Login", True, "Successfully logged in and obtained JWT token")
                return True
            else:
                self.log_test("User Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("User Login", False, f"Login error: {str(e)}")
            return False
    
    def create_test_category(self):
        """Create a test category for items"""
        try:
            category_data = {"name": f"Test Category {datetime.now().strftime('%H%M%S')}"}
            response = self.session.post(f"{BASE_URL}/categories", json=category_data)
            if response.status_code == 200:
                category = response.json()
                self.log_test("Create Test Category", True, f"Created category: {category['name']}")
                return category["id"]
            else:
                self.log_test("Create Test Category", False, f"Failed with status {response.status_code}", response.text)
                return None
        except Exception as e:
            self.log_test("Create Test Category", False, f"Error: {str(e)}")
            return None
    
    def create_test_items(self, category_id):
        """Create test items for orders"""
        items = []
        test_items = [
            {"name": f"Test Item 1 {datetime.now().strftime('%H%M%S')}", "price": 10.50},
            {"name": f"Test Item 2 {datetime.now().strftime('%H%M%S')}", "price": 15.75}
        ]
        
        for item_data in test_items:
            try:
                item_data["category_id"] = category_id
                response = self.session.post(f"{BASE_URL}/items", json=item_data)
                if response.status_code == 200:
                    item = response.json()
                    items.append(item)
                    self.log_test("Create Test Item", True, f"Created item: {item['name']}")
                else:
                    self.log_test("Create Test Item", False, f"Failed with status {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Create Test Item", False, f"Error: {str(e)}")
        
        return items
    
    def test_enhanced_order_creation(self, items):
        """Test enhanced order creation with sales_person_name and status"""
        try:
            order_data = {
                "items": [
                    {
                        "item_id": items[0]["id"],
                        "name": items[0]["name"],
                        "price": items[0]["price"],
                        "quantity": 2
                    },
                    {
                        "item_id": items[1]["id"],
                        "name": items[1]["name"],
                        "price": items[1]["price"],
                        "quantity": 1
                    }
                ],
                "subtotal": 36.75,
                "discount_percentage": 0,
                "discount_amount": 0,
                "total": 36.75,
                "payment_method": "cash",
                "cash_amount": 40.00,
                "change_amount": 3.25
            }
            
            response = self.session.post(f"{BASE_URL}/orders", json=order_data)
            if response.status_code == 200:
                order = response.json()
                
                # Check if enhanced fields are present
                has_sales_person = "sales_person_name" in order or hasattr(order, 'sales_person_name')
                has_status = "status" in order or hasattr(order, 'status')
                has_order_number = "order_number" in order
                
                if has_sales_person and has_order_number:
                    self.log_test("Enhanced Order Creation", True, 
                                f"Order created with enhanced fields - Order: {order.get('order_number', 'N/A')}, Sales Person: {order.get('sales_person_name', 'N/A')}")
                    return order
                else:
                    missing_fields = []
                    if not has_sales_person: missing_fields.append("sales_person_name")
                    if not has_status: missing_fields.append("status")
                    self.log_test("Enhanced Order Creation", False, 
                                f"Order created but missing enhanced fields: {', '.join(missing_fields)}", 
                                json.dumps(order, indent=2))
                    return order
            else:
                self.log_test("Enhanced Order Creation", False, f"Failed with status {response.status_code}", response.text)
                return None
        except Exception as e:
            self.log_test("Enhanced Order Creation", False, f"Error: {str(e)}")
            return None
    
    def test_get_orders_enhanced(self):
        """Test GET /api/orders with enhanced data"""
        try:
            response = self.session.get(f"{BASE_URL}/orders")
            if response.status_code == 200:
                orders = response.json()
                if not orders:
                    self.log_test("Get Orders Enhanced", False, "No orders found to test enhanced data")
                    return False
                
                first_order = orders[0]
                
                # Check required enhanced fields
                has_sales_person = "sales_person_name" in first_order
                has_status = "status" in first_order
                has_created_at = "created_at" in first_order
                
                # Check if created_at is in ISO format
                iso_format_valid = False
                if has_created_at:
                    try:
                        datetime.fromisoformat(first_order["created_at"].replace('Z', '+00:00'))
                        iso_format_valid = True
                    except:
                        pass
                
                # Check if orders are sorted by created_at descending (most recent first)
                sorted_correctly = True
                if len(orders) > 1:
                    for i in range(len(orders) - 1):
                        if orders[i]["created_at"] < orders[i + 1]["created_at"]:
                            sorted_correctly = False
                            break
                
                success = has_sales_person and has_status and has_created_at and iso_format_valid and sorted_correctly
                
                if success:
                    self.log_test("Get Orders Enhanced", True, 
                                f"Orders returned with enhanced data - Found {len(orders)} orders, properly sorted")
                else:
                    issues = []
                    if not has_sales_person: issues.append("missing sales_person_name")
                    if not has_status: issues.append("missing status")
                    if not has_created_at: issues.append("missing created_at")
                    if not iso_format_valid: issues.append("created_at not in ISO format")
                    if not sorted_correctly: issues.append("not sorted by created_at descending")
                    
                    self.log_test("Get Orders Enhanced", False, f"Issues found: {', '.join(issues)}", 
                                json.dumps(first_order, indent=2))
                
                return orders
            else:
                self.log_test("Get Orders Enhanced", False, f"Failed with status {response.status_code}", response.text)
                return None
        except Exception as e:
            self.log_test("Get Orders Enhanced", False, f"Error: {str(e)}")
            return None
    
    def test_return_item(self, order):
        """Test returning an item from an order"""
        try:
            if not order or "items" not in order or len(order["items"]) == 0:
                self.log_test("Return Item", False, "No order or items available for testing")
                return False
            
            order_id = order["id"]
            item_to_return = order["items"][0]
            item_id = item_to_return["item_id"]
            
            # Test returning an item
            return_data = {"item_id": item_id}
            response = self.session.post(f"{BASE_URL}/orders/{order_id}/return-item", json=return_data)
            
            if response.status_code == 200:
                self.log_test("Return Item", True, f"Successfully returned item {item_to_return['name']} from order {order_id}")
                
                # Test returning the same item again (should fail)
                response2 = self.session.post(f"{BASE_URL}/orders/{order_id}/return-item", json=return_data)
                if response2.status_code == 400:
                    self.log_test("Return Item Duplicate Prevention", True, "Correctly prevented returning already returned item")
                else:
                    self.log_test("Return Item Duplicate Prevention", False, 
                                f"Should have prevented duplicate return, got status {response2.status_code}")
                
                return True
            else:
                self.log_test("Return Item", False, f"Failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Return Item", False, f"Error: {str(e)}")
            return False
    
    def test_refund_order(self, items):
        """Test refunding an entire order"""
        try:
            # Create a new order for refund testing
            order_data = {
                "items": [
                    {
                        "item_id": items[0]["id"],
                        "name": items[0]["name"],
                        "price": items[0]["price"],
                        "quantity": 1
                    }
                ],
                "subtotal": 10.50,
                "discount_percentage": 0,
                "discount_amount": 0,
                "total": 10.50,
                "payment_method": "qr",
                "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            }
            
            response = self.session.post(f"{BASE_URL}/orders", json=order_data)
            if response.status_code != 200:
                self.log_test("Refund Order Setup", False, "Failed to create order for refund testing")
                return False
            
            refund_order = response.json()
            order_id = refund_order["id"]
            
            # Test refunding the order
            response = self.session.post(f"{BASE_URL}/orders/{order_id}/refund")
            
            if response.status_code == 200:
                self.log_test("Refund Order", True, f"Successfully refunded order {order_id}")
                
                # Test refunding the same order again (should fail)
                response2 = self.session.post(f"{BASE_URL}/orders/{order_id}/refund")
                if response2.status_code == 400:
                    self.log_test("Refund Order Duplicate Prevention", True, "Correctly prevented refunding already refunded order")
                else:
                    self.log_test("Refund Order Duplicate Prevention", False, 
                                f"Should have prevented duplicate refund, got status {response2.status_code}")
                
                # Test returning item from refunded order (should fail)
                if refund_order["items"]:
                    item_id = refund_order["items"][0]["item_id"]
                    return_data = {"item_id": item_id}
                    response3 = self.session.post(f"{BASE_URL}/orders/{order_id}/return-item", json=return_data)
                    if response3.status_code == 400:
                        self.log_test("Return from Refunded Order Prevention", True, "Correctly prevented returning item from refunded order")
                    else:
                        self.log_test("Return from Refunded Order Prevention", False, 
                                    f"Should have prevented return from refunded order, got status {response3.status_code}")
                
                return True
            else:
                self.log_test("Refund Order", False, f"Failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Refund Order", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 80)
        print("F&B POS BACKEND API TESTING - NEW FEATURES")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Test user: {TEST_USER['phone']}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Step 2: Setup test data
        category_id = self.create_test_category()
        if not category_id:
            print("❌ Cannot proceed without test category")
            return False
        
        items = self.create_test_items(category_id)
        if len(items) < 2:
            print("❌ Cannot proceed without test items")
            return False
        
        # Step 3: Test enhanced order creation
        test_order = self.test_enhanced_order_creation(items)
        
        # Step 4: Test enhanced order retrieval
        orders = self.test_get_orders_enhanced()
        
        # Step 5: Test return item functionality
        if test_order:
            self.test_return_item(test_order)
        
        # Step 6: Test refund order functionality
        self.test_refund_order(items)
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)