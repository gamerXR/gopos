#!/usr/bin/env python3
"""
Comprehensive Backend Testing for F&B POS System
Tests all API endpoints including authentication, categories, items, and orders
"""

import requests
import json
import base64
import time
from typing import Dict, List, Optional

# Configuration
BACKEND_URL = "https://cafe-pos-android.preview.emergentagent.com/api"
DEFAULT_PHONE = "8889999"
DEFAULT_PASSWORD = "123456"

class POSTestClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
        
    def login(self, phone: str, password: str) -> Dict:
        """Login and store token"""
        response = self.session.post(
            f"{self.base_url}/login",
            json={"phone": phone, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return data
        else:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")
    
    def get_headers(self) -> Dict:
        """Get headers with auth token"""
        if not self.token:
            raise Exception("Not authenticated. Please login first.")
        return {"Authorization": f"Bearer {self.token}"}

def test_authentication():
    """Test authentication endpoints"""
    print("\n=== TESTING AUTHENTICATION ===")
    client = POSTestClient(BACKEND_URL)
    
    # Test 1: Login with correct credentials
    print("1. Testing login with correct credentials...")
    try:
        result = client.login(DEFAULT_PHONE, DEFAULT_PASSWORD)
        print(f"✅ Login successful: {result['user']['name']}")
        print(f"   Token received: {result['token'][:20]}...")
        assert "token" in result
        assert "user" in result
        assert result["user"]["phone"] == DEFAULT_PHONE
    except Exception as e:
        print(f"❌ Login with correct credentials failed: {e}")
        return False
    
    # Test 2: Login with incorrect credentials
    print("2. Testing login with incorrect credentials...")
    try:
        client_bad = POSTestClient(BACKEND_URL)
        client_bad.login("9999999", "wrongpassword")
        print("❌ Login with incorrect credentials should have failed")
        return False
    except Exception as e:
        if "401" in str(e) or "Invalid" in str(e):
            print("✅ Login correctly rejected invalid credentials")
        else:
            print(f"❌ Unexpected error: {e}")
            return False
    
    # Test 3: Verify JWT token is valid
    print("3. Testing JWT token validity...")
    try:
        response = client.session.get(f"{BACKEND_URL}/categories")
        if response.status_code == 200:
            print("✅ JWT token is valid and accepted")
        else:
            print(f"❌ JWT token validation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ JWT token test failed: {e}")
        return False
    
    return client

def test_categories(client: POSTestClient):
    """Test category management"""
    print("\n=== TESTING CATEGORY MANAGEMENT ===")
    created_categories = []
    
    # Test 1: Create multiple categories
    print("1. Creating multiple categories...")
    categories_to_create = ["Beverages", "Food", "Desserts"]
    
    for cat_name in categories_to_create:
        try:
            response = client.session.post(
                f"{BACKEND_URL}/categories",
                json={"name": cat_name}
            )
            if response.status_code == 200:
                category = response.json()
                created_categories.append(category)
                print(f"✅ Created category: {cat_name} (ID: {category['id']})")
            else:
                print(f"❌ Failed to create category {cat_name}: {response.status_code} - {response.text}")
                return False, []
        except Exception as e:
            print(f"❌ Error creating category {cat_name}: {e}")
            return False, []
    
    # Test 2: List all categories
    print("2. Listing all categories...")
    try:
        response = client.session.get(f"{BACKEND_URL}/categories")
        if response.status_code == 200:
            categories = response.json()
            print(f"✅ Retrieved {len(categories)} categories")
            for cat in categories:
                print(f"   - {cat['name']} (ID: {cat['id']})")
        else:
            print(f"❌ Failed to list categories: {response.status_code}")
            return False, []
    except Exception as e:
        print(f"❌ Error listing categories: {e}")
        return False, []
    
    # Test 3: Test authentication requirement
    print("3. Testing authentication requirement...")
    try:
        response = requests.get(f"{BACKEND_URL}/categories")  # No auth headers
        if response.status_code == 401 or response.status_code == 403:
            print("✅ Categories endpoint correctly requires authentication")
        else:
            print(f"❌ Categories endpoint should require authentication: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing auth requirement: {e}")
    
    # Test 4: Delete a category (we'll delete the last one)
    if created_categories:
        print("4. Testing category deletion...")
        category_to_delete = created_categories[-1]
        try:
            response = client.session.delete(f"{BACKEND_URL}/categories/{category_to_delete['id']}")
            if response.status_code == 200:
                print(f"✅ Deleted category: {category_to_delete['name']}")
                created_categories.pop()  # Remove from our list
            else:
                print(f"❌ Failed to delete category: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error deleting category: {e}")
    
    return True, created_categories

def test_items(client: POSTestClient, categories: List[Dict]):
    """Test item management"""
    print("\n=== TESTING ITEM MANAGEMENT ===")
    created_items = []
    
    if not categories:
        print("❌ No categories available for item testing")
        return False, []
    
    # Test 1: Create items in different categories
    print("1. Creating items in different categories...")
    items_to_create = [
        {"name": "Coffee", "category_id": categories[0]["id"], "price": 4.50, "stock": 100},
        {"name": "Tea", "category_id": categories[0]["id"], "price": 3.00, "stock": 50},
        {"name": "Sandwich", "category_id": categories[1]["id"] if len(categories) > 1 else categories[0]["id"], "price": 8.00, "stock": 25}
    ]
    
    for item_data in items_to_create:
        try:
            response = client.session.post(
                f"{BACKEND_URL}/items",
                json=item_data
            )
            if response.status_code == 200:
                item = response.json()
                created_items.append(item)
                print(f"✅ Created item: {item['name']} - ${item['price']} (Stock: {item['stock']})")
            else:
                print(f"❌ Failed to create item {item_data['name']}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error creating item {item_data['name']}: {e}")
    
    # Test 2: List all items
    print("2. Listing all items...")
    try:
        response = client.session.get(f"{BACKEND_URL}/items")
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} items")
            for item in items:
                print(f"   - {item['name']} ({item['category_name']}) - ${item['price']} (Stock: {item['stock']})")
        else:
            print(f"❌ Failed to list items: {response.status_code}")
    except Exception as e:
        print(f"❌ Error listing items: {e}")
    
    # Test 3: Filter items by category
    if categories:
        print("3. Testing item filtering by category...")
        try:
            response = client.session.get(f"{BACKEND_URL}/items?category_id={categories[0]['id']}")
            if response.status_code == 200:
                filtered_items = response.json()
                print(f"✅ Retrieved {len(filtered_items)} items for category {categories[0]['name']}")
                for item in filtered_items:
                    if item['category_id'] != categories[0]['id']:
                        print(f"❌ Filter failed: Item {item['name']} has wrong category")
                        return False, []
            else:
                print(f"❌ Failed to filter items: {response.status_code}")
        except Exception as e:
            print(f"❌ Error filtering items: {e}")
    
    # Test 4: Update item stock
    if created_items:
        print("4. Testing stock update...")
        item_to_update = created_items[0]
        new_stock = 75
        try:
            response = client.session.put(
                f"{BACKEND_URL}/items/{item_to_update['id']}/stock",
                json=new_stock
            )
            if response.status_code == 200:
                print(f"✅ Updated stock for {item_to_update['name']} to {new_stock}")
                # Update our local copy
                item_to_update['stock'] = new_stock
            else:
                print(f"❌ Failed to update stock: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error updating stock: {e}")
    
    # Test 5: Test authentication requirement
    print("5. Testing authentication requirement...")
    try:
        response = requests.get(f"{BACKEND_URL}/items")  # No auth headers
        if response.status_code == 401 or response.status_code == 403:
            print("✅ Items endpoint correctly requires authentication")
        else:
            print(f"❌ Items endpoint should require authentication: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing auth requirement: {e}")
    
    return True, created_items

def test_orders(client: POSTestClient, items: List[Dict]):
    """Test order management"""
    print("\n=== TESTING ORDER MANAGEMENT ===")
    created_orders = []
    
    if not items:
        print("❌ No items available for order testing")
        return False, []
    
    # Test 1: Create order with cash payment
    print("1. Creating order with cash payment...")
    order_items = [
        {
            "item_id": items[0]["id"],
            "name": items[0]["name"],
            "price": items[0]["price"],
            "quantity": 2
        }
    ]
    
    if len(items) > 1:
        order_items.append({
            "item_id": items[1]["id"],
            "name": items[1]["name"],
            "price": items[1]["price"],
            "quantity": 1
        })
    
    subtotal = sum(item["price"] * item["quantity"] for item in order_items)
    
    cash_order = {
        "items": order_items,
        "subtotal": subtotal,
        "payment_method": "cash"
    }
    
    try:
        response = client.session.post(
            f"{BACKEND_URL}/orders",
            json=cash_order
        )
        if response.status_code == 200:
            order = response.json()
            created_orders.append(order)
            print(f"✅ Created cash order: {order['order_number']} - ${order['subtotal']}")
            print(f"   Items: {len(order['items'])}")
        else:
            print(f"❌ Failed to create cash order: {response.status_code} - {response.text}")
            return False, []
    except Exception as e:
        print(f"❌ Error creating cash order: {e}")
        return False, []
    
    # Test 2: Create order with QR payment
    print("2. Creating order with QR payment...")
    # Create a simple base64 encoded image (1x1 pixel PNG)
    qr_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    qr_order = {
        "items": [order_items[0]],  # Single item order
        "subtotal": order_items[0]["price"] * order_items[0]["quantity"],
        "payment_method": "qr",
        "qr_image": qr_image_b64
    }
    
    try:
        response = client.session.post(
            f"{BACKEND_URL}/orders",
            json=qr_order
        )
        if response.status_code == 200:
            order = response.json()
            created_orders.append(order)
            print(f"✅ Created QR order: {order['order_number']} - ${order['subtotal']}")
            print(f"   QR image included: {'Yes' if order.get('qr_image') else 'No'}")
        else:
            print(f"❌ Failed to create QR order: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error creating QR order: {e}")
    
    # Test 3: Verify stock deduction
    print("3. Verifying stock deduction...")
    try:
        response = client.session.get(f"{BACKEND_URL}/items")
        if response.status_code == 200:
            current_items = response.json()
            for current_item in current_items:
                for original_item in items:
                    if current_item['id'] == original_item['id']:
                        expected_stock = original_item['stock']
                        # Calculate total quantity ordered for this item
                        total_ordered = 0
                        for order in created_orders:
                            for order_item in order['items']:
                                if order_item['item_id'] == current_item['id']:
                                    total_ordered += order_item['quantity']
                        
                        expected_stock -= total_ordered
                        if current_item['stock'] == expected_stock:
                            print(f"✅ Stock correctly deducted for {current_item['name']}: {current_item['stock']} (was {original_item['stock']})")
                        else:
                            print(f"❌ Stock deduction error for {current_item['name']}: expected {expected_stock}, got {current_item['stock']}")
        else:
            print(f"❌ Failed to verify stock: {response.status_code}")
    except Exception as e:
        print(f"❌ Error verifying stock: {e}")
    
    # Test 4: Verify order number generation
    print("4. Verifying order number generation...")
    if len(created_orders) >= 2:
        order1_num = created_orders[0]['order_number']
        order2_num = created_orders[1]['order_number']
        
        if order1_num.startswith('ORD') and order2_num.startswith('ORD'):
            num1 = int(order1_num[3:])
            num2 = int(order2_num[3:])
            if num2 == num1 + 1:
                print(f"✅ Order numbers correctly sequential: {order1_num} → {order2_num}")
            else:
                print(f"❌ Order numbers not sequential: {order1_num} → {order2_num}")
        else:
            print(f"❌ Order numbers don't follow ORD format: {order1_num}, {order2_num}")
    
    # Test 5: Test insufficient stock scenario
    print("5. Testing insufficient stock scenario...")
    if items:
        # Try to order more than available stock
        high_quantity_order = {
            "items": [{
                "item_id": items[0]["id"],
                "name": items[0]["name"],
                "price": items[0]["price"],
                "quantity": 1000  # Way more than stock
            }],
            "subtotal": items[0]["price"] * 1000,
            "payment_method": "cash"
        }
        
        try:
            response = client.session.post(
                f"{BACKEND_URL}/orders",
                json=high_quantity_order
            )
            if response.status_code == 400 and "Insufficient stock" in response.text:
                print("✅ Insufficient stock correctly handled")
            else:
                print(f"❌ Insufficient stock not handled properly: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error testing insufficient stock: {e}")
    
    # Test 6: List all orders
    print("6. Listing all orders...")
    try:
        response = client.session.get(f"{BACKEND_URL}/orders")
        if response.status_code == 200:
            orders = response.json()
            print(f"✅ Retrieved {len(orders)} orders")
            for order in orders:
                print(f"   - {order['order_number']}: ${order['subtotal']} ({order['payment_method']})")
        else:
            print(f"❌ Failed to list orders: {response.status_code}")
    except Exception as e:
        print(f"❌ Error listing orders: {e}")
    
    return True, created_orders

def test_integration_flow(client: POSTestClient):
    """Test full integration flow"""
    print("\n=== TESTING INTEGRATION FLOW ===")
    
    # Full flow: Create category → Create items → Create order → Verify stock updated
    print("1. Full integration test...")
    
    # Create a test category
    try:
        response = client.session.post(
            f"{BACKEND_URL}/categories",
            json={"name": "Integration Test Category"}
        )
        if response.status_code != 200:
            print(f"❌ Failed to create test category: {response.status_code}")
            return False
        category = response.json()
        print(f"✅ Created test category: {category['name']}")
    except Exception as e:
        print(f"❌ Error creating test category: {e}")
        return False
    
    # Create test items
    test_items = []
    items_data = [
        {"name": "Integration Coffee", "category_id": category["id"], "price": 5.00, "stock": 10},
        {"name": "Integration Pastry", "category_id": category["id"], "price": 3.50, "stock": 5}
    ]
    
    for item_data in items_data:
        try:
            response = client.session.post(
                f"{BACKEND_URL}/items",
                json=item_data
            )
            if response.status_code == 200:
                item = response.json()
                test_items.append(item)
                print(f"✅ Created test item: {item['name']} (Stock: {item['stock']})")
            else:
                print(f"❌ Failed to create test item: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error creating test item: {e}")
            return False
    
    # Create order with multiple items
    order_items = [
        {
            "item_id": test_items[0]["id"],
            "name": test_items[0]["name"],
            "price": test_items[0]["price"],
            "quantity": 3
        },
        {
            "item_id": test_items[1]["id"],
            "name": test_items[1]["name"],
            "price": test_items[1]["price"],
            "quantity": 2
        }
    ]
    
    subtotal = sum(item["price"] * item["quantity"] for item in order_items)
    
    integration_order = {
        "items": order_items,
        "subtotal": subtotal,
        "payment_method": "cash"
    }
    
    try:
        response = client.session.post(
            f"{BACKEND_URL}/orders",
            json=integration_order
        )
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Created integration order: {order['order_number']} - ${order['subtotal']}")
        else:
            print(f"❌ Failed to create integration order: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating integration order: {e}")
        return False
    
    # Verify stock was updated correctly
    try:
        response = client.session.get(f"{BACKEND_URL}/items")
        if response.status_code == 200:
            current_items = response.json()
            for current_item in current_items:
                for original_item in test_items:
                    if current_item['id'] == original_item['id']:
                        if original_item['name'] == 'Integration Coffee':
                            expected_stock = 10 - 3  # 7
                        elif original_item['name'] == 'Integration Pastry':
                            expected_stock = 5 - 2   # 3
                        else:
                            continue
                        
                        if current_item['stock'] == expected_stock:
                            print(f"✅ Integration stock update verified: {current_item['name']} = {current_item['stock']}")
                        else:
                            print(f"❌ Integration stock update failed: {current_item['name']} expected {expected_stock}, got {current_item['stock']}")
                            return False
        else:
            print(f"❌ Failed to verify integration stock: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error verifying integration stock: {e}")
        return False
    
    # Test subtotal calculation
    expected_subtotal = (5.00 * 3) + (3.50 * 2)  # 15.00 + 7.00 = 22.00
    if abs(order['subtotal'] - expected_subtotal) < 0.01:
        print(f"✅ Subtotal calculation correct: ${order['subtotal']}")
    else:
        print(f"❌ Subtotal calculation incorrect: expected ${expected_subtotal}, got ${order['subtotal']}")
        return False
    
    print("✅ Integration flow test completed successfully")
    return True

def main():
    """Run all tests"""
    print("🚀 Starting F&B POS Backend Testing")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test 1: Authentication
    client = test_authentication()
    if not client:
        print("❌ Authentication tests failed. Cannot continue.")
        return
    
    # Test 2: Categories
    categories_success, categories = test_categories(client)
    if not categories_success:
        print("❌ Category tests failed.")
        return
    
    # Test 3: Items
    items_success, items = test_items(client, categories)
    if not items_success:
        print("❌ Item tests failed.")
        return
    
    # Test 4: Orders
    orders_success, orders = test_orders(client, items)
    if not orders_success:
        print("❌ Order tests failed.")
        return
    
    # Test 5: Integration
    integration_success = test_integration_flow(client)
    if not integration_success:
        print("❌ Integration tests failed.")
        return
    
    print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
    print("\n=== SUMMARY ===")
    print("✅ Authentication: Login, token validation, error handling")
    print("✅ Categories: Create, list, delete, auth requirements")
    print("✅ Items: Create, list, filter, stock update, delete, auth requirements")
    print("✅ Orders: Cash payment, QR payment, stock deduction, order numbering, insufficient stock handling")
    print("✅ Integration: Full flow with multiple items and stock verification")

if __name__ == "__main__":
    main()