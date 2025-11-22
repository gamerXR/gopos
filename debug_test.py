#!/usr/bin/env python3
"""
Debug specific test failures
"""

import requests
import json

BASE_URL = "https://gopos-app.preview.emergentagent.com/api"
CLIENT_USER = {"phone": "8889999", "password": "123456"}

def test_jwt_invalid_token():
    """Test JWT invalid token handling"""
    print("Testing JWT invalid token rejection...")
    
    # Test with invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(f"{BASE_URL}/categories", headers=headers)
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    if response.status_code == 401:
        print("✅ Invalid token correctly rejected")
    else:
        print("❌ Invalid token not rejected")

def test_order_sales_person():
    """Test order creation and sales person field"""
    print("\nTesting order creation and sales person field...")
    
    # Login first
    response = requests.post(f"{BASE_URL}/login", json=CLIENT_USER)
    if response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a simple order
    order_data = {
        "items": [
            {
                "item_id": "test_item",
                "name": "Test Item",
                "price": 5.00,
                "quantity": 1
            }
        ],
        "subtotal": 5.00,
        "total": 5.00,
        "payment_method": "cash"
    }
    
    response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
    
    print(f"Order creation status: {response.status_code}")
    if response.status_code == 200:
        order = response.json()
        print(f"Order response keys: {list(order.keys())}")
        
        if "sales_person_name" in order:
            print(f"✅ Sales person found: {order['sales_person_name']}")
        else:
            print("❌ Sales person missing")
            print(f"Full order: {json.dumps(order, indent=2)}")
    else:
        print(f"❌ Order creation failed: {response.text}")

def test_return_item_duplicate():
    """Test return item duplicate prevention"""
    print("\nTesting return item duplicate prevention...")
    
    # Login first
    response = requests.post(f"{BASE_URL}/login", json=CLIENT_USER)
    if response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get existing orders
    response = requests.get(f"{BASE_URL}/orders", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get orders")
        return
    
    orders = response.json()
    if not orders:
        print("❌ No orders available for testing")
        return
    
    # Find an order with items
    test_order = None
    for order in orders:
        if order.get("items") and order.get("status") != "refunded":
            test_order = order
            break
    
    if not test_order:
        print("❌ No suitable order found for testing")
        return
    
    order_id = test_order["id"]
    item_id = test_order["items"][0]["item_id"]
    
    print(f"Testing with order {order_id}, item {item_id}")
    
    # Try to return the same item twice
    return_data = {"item_id": item_id}
    
    # First return
    response1 = requests.post(f"{BASE_URL}/orders/{order_id}/return-item", json=return_data, headers=headers)
    print(f"First return status: {response1.status_code}")
    
    # Second return (should fail)
    response2 = requests.post(f"{BASE_URL}/orders/{order_id}/return-item", json=return_data, headers=headers)
    print(f"Second return status: {response2.status_code}")
    print(f"Second return response: {response2.text}")
    
    if response2.status_code == 400:
        print("✅ Duplicate return correctly prevented")
    else:
        print("❌ Duplicate return not prevented")

if __name__ == "__main__":
    test_jwt_invalid_token()
    test_order_sales_person()
    test_return_item_duplicate()