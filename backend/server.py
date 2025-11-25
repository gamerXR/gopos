from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'gopos_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'gopos-super-secret-key-change-in-production-2024')
JWT_ALGORITHM = 'HS256'

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to hash passwords
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"_id": ObjectId(payload['user_id'])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Helper to get client-specific collections
def get_client_collections(user_id: str):
    """Get collection names specific to a client"""
    return {
        'categories': f'categories_{user_id}',
        'items': f'items_{user_id}',
        'orders': f'orders_{user_id}'
    }

# Pydantic Models
class LoginRequest(BaseModel):
    phone: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class Client(BaseModel):
    company_name: str
    phone: str
    password: str
    qr_payment_image: Optional[str] = None  # base64 or URL

class ClientResponse(BaseModel):
    id: str
    company_name: str
    phone: str
    qr_payment_image: Optional[str] = None
    created_at: datetime

class ClientUpdate(BaseModel):
    company_name: str
    phone: str
    qr_payment_image: Optional[str] = None

class Category(BaseModel):
    name: str

class CategoryResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

class Item(BaseModel):
    name: str
    category_id: str
    price: float

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    category_name: str
    price: float
    created_at: datetime

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    items: List[OrderItem]
    subtotal: float
    discount_percentage: Optional[float] = 0  # Discount percentage
    discount_amount: Optional[float] = 0  # Calculated discount amount
    total: float  # Final total after discount
    payment_method: str  # "cash" or "qr"
    cash_amount: Optional[float] = None  # Amount customer gave
    change_amount: Optional[float] = None  # Change to return
    qr_image: Optional[str] = None  # base64 image for QR payment

class OrderResponse(BaseModel):
    id: str
    items: List[OrderItem]
    subtotal: float
    discount_percentage: Optional[float] = 0
    discount_amount: Optional[float] = 0
    total: float
    payment_method: str
    cash_amount: Optional[float] = None
    change_amount: Optional[float] = None
    qr_image: Optional[str] = None
    created_at: datetime
    order_number: str

# Initialize default users on startup
@app.on_event("startup")
async def startup_event():
    # Check if default staff user exists
    existing_user = await db.users.find_one({"phone": "8889999"})
    if not existing_user:
        # Create default staff user
        default_user = {
            "phone": "8889999",
            "password": hash_password("123456"),
            "role": "staff",
            "name": "Staff User",
            "company_name": "Demo Company",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(default_user)
        logger.info("Default staff user created")
    
    # Check if super admin exists
    existing_admin = await db.users.find_one({"phone": "6737165617"})
    if not existing_admin:
        # Create super admin
        super_admin = {
            "phone": "6737165617",
            "password": hash_password("448613"),
            "role": "super_admin",
            "name": "Super Admin",
            "company_name": "Super Admin",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(super_admin)
        logger.info("Super admin created")
    
    # Create unique indexes (if not exists)
    try:
        await db.categories.create_index("name", unique=True)
    except Exception as e:
        logger.warning(f"Category index already exists: {e}")
    
    try:
        await db.items.create_index("name", unique=True)
    except Exception as e:
        logger.warning(f"Item index already exists: {e}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "F&B POS API"}

@api_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"phone": request.phone})
    if not user or not verify_password(request.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    token = create_token(str(user['_id']))
    return LoginResponse(
        token=token,
        user={
            "id": str(user['_id']),
            "phone": user['phone'],
            "role": user['role'],
            "name": user['name'],
            "company_name": user.get('company_name', ''),
            "qr_payment_image": user.get('qr_payment_image', '')
        }
    )

# Category Routes
@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: Category, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    categories_coll = db[collections['categories']]
    
    # Check for duplicate
    existing = await categories_coll.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category_dict = category.dict()
    category_dict['created_at'] = datetime.utcnow()
    result = await categories_coll.insert_one(category_dict)
    category_dict['id'] = str(result.inserted_id)
    return CategoryResponse(**category_dict)

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    categories_coll = db[collections['categories']]
    categories = await categories_coll.find().to_list(1000)
    return [CategoryResponse(
        id=str(cat['_id']),
        name=cat['name'],
        created_at=cat['created_at']
    ) for cat in categories]

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    categories_coll = db[collections['categories']]
    items_coll = db[collections['items']]
    
    result = await categories_coll.delete_one({"_id": ObjectId(category_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    # Also delete all items in this category
    await items_coll.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# Item Routes
@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: Item, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    items_coll = db[collections['items']]
    categories_coll = db[collections['categories']]
    
    # Check for duplicate
    existing = await items_coll.find_one({"name": item.name})
    if existing:
        raise HTTPException(status_code=400, detail="Item name already exists")
    
    # Verify category exists
    category = await categories_coll.find_one({"_id": ObjectId(item.category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    item_dict = item.dict()
    item_dict['created_at'] = datetime.utcnow()
    result = await items_coll.insert_one(item_dict)
    
    return ItemResponse(
        id=str(result.inserted_id),
        name=item_dict['name'],
        category_id=item_dict['category_id'],
        category_name=category['name'],
        price=item_dict['price'],
        created_at=item_dict['created_at']
    )

@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(category_id: Optional[str] = None, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    items_coll = db[collections['items']]
    categories_coll = db[collections['categories']]
    
    query = {}
    if category_id:
        query['category_id'] = category_id
    
    items = await items_coll.find(query).to_list(1000)
    
    # Get category names
    category_ids = list(set([item['category_id'] for item in items]))
    categories = {}
    for cat_id in category_ids:
        cat = await categories_coll.find_one({"_id": ObjectId(cat_id)})
        if cat:
            categories[cat_id] = cat['name']
    
    return [ItemResponse(
        id=str(item['_id']),
        name=item['name'],
        category_id=item['category_id'],
        category_name=categories.get(item['category_id'], 'Unknown'),
        price=item['price'],
        created_at=item['created_at']
    ) for item in items]

@api_router.put("/items/{item_id}")
async def update_item(item_id: str, item: Item, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    items_coll = db[collections['items']]
    categories_coll = db[collections['categories']]
    
    # Check for duplicate name (excluding current item)
    existing = await items_coll.find_one({"name": item.name, "_id": {"$ne": ObjectId(item_id)}})
    if existing:
        raise HTTPException(status_code=400, detail="Item name already exists")
    
    # Verify category exists
    category = await categories_coll.find_one({"_id": ObjectId(item.category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    result = await items_coll.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {
            "name": item.name,
            "category_id": item.category_id,
            "price": item.price
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item updated successfully"}

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    items_coll = db[collections['items']]
    
    result = await items_coll.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# Order Routes
@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: Order, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Get order number (count + 1)
    order_count = await orders_coll.count_documents({})
    order_number = f"ORD{str(order_count + 1).zfill(5)}"
    
    order_dict = order.dict()
    order_dict['created_at'] = datetime.utcnow()
    order_dict['created_by'] = str(user['_id'])
    order_dict['sales_person_name'] = user.get('name', 'Staff')
    order_dict['order_number'] = order_number
    order_dict['status'] = 'completed'  # completed, refunded
    
    result = await orders_coll.insert_one(order_dict)
    
    return OrderResponse(
        id=str(result.inserted_id),
        items=order.items,
        subtotal=order.subtotal,
        discount_percentage=order.discount_percentage,
        discount_amount=order.discount_amount,
        total=order.total,
        payment_method=order.payment_method,
        cash_amount=order.cash_amount,
        change_amount=order.change_amount,
        qr_image=order.qr_image,
        created_at=order_dict['created_at'],
        order_number=order_number
    )

@api_router.get("/orders", response_model=List[dict])
async def get_orders(user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    orders = await orders_coll.find().sort("created_at", -1).to_list(1000)
    return [{
        'id': str(order['_id']),
        'items': order['items'],
        'subtotal': order['subtotal'],
        'discount_percentage': order.get('discount_percentage', 0),
        'discount_amount': order.get('discount_amount', 0),
        'total': order.get('total', order['subtotal']),
        'payment_method': order['payment_method'],
        'cash_amount': order.get('cash_amount'),
        'change_amount': order.get('change_amount'),
        'qr_image': order.get('qr_image'),
        'created_at': order['created_at'].isoformat(),
        'created_by': order.get('created_by', ''),
        'sales_person_name': order.get('sales_person_name', 'Staff'),
        'order_number': order['order_number'],
        'status': order.get('status', 'completed')
    } for order in orders]

@api_router.post("/orders/{order_id}/return-item")
async def return_item(order_id: str, request: dict, user = Depends(get_current_user)):
    """Return a specific item from an order"""
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    item_id = request.get('item_id')
    if not item_id:
        raise HTTPException(status_code=400, detail="item_id is required")
    
    # Get the order
    order = await orders_coll.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('status') == 'refunded':
        raise HTTPException(status_code=400, detail="Cannot return items from refunded order")
    
    # Find the item in the order
    item_found = False
    for item in order['items']:
        if item['item_id'] == item_id:
            if item.get('returned'):
                raise HTTPException(status_code=400, detail="Item already returned")
            item['returned'] = True
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item not found in order")
    
    # Update the order
    await orders_coll.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"items": order['items']}}
    )
    
    return {"message": "Item returned successfully"}

@api_router.post("/orders/{order_id}/refund")
async def refund_order(order_id: str, user = Depends(get_current_user)):
    """Refund an entire order"""
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Get the order
    order = await orders_coll.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('status') == 'refunded':
        raise HTTPException(status_code=400, detail="Order already refunded")
    
    # Mark all items as returned and update order status
    for item in order['items']:
        item['returned'] = True
    
    await orders_coll.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "refunded",
            "items": order['items'],
            "refunded_at": datetime.utcnow(),
            "refunded_by": str(user['_id'])
        }}
    )
    
    return {"message": "Order refunded successfully"}

# Client Management Routes (Super Admin Only)
@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client: Client, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can create clients")
    
    # Check if phone already exists
    existing = await db.users.find_one({"phone": client.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already exists")
    
    client_dict = {
        "phone": client.phone,
        "password": hash_password(client.password),
        "role": "client",
        "name": client.company_name,
        "company_name": client.company_name,
        "qr_payment_image": client.qr_payment_image,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(client_dict)
    
    return ClientResponse(
        id=str(result.inserted_id),
        company_name=client.company_name,
        phone=client.phone,
        qr_payment_image=client.qr_payment_image,
        created_at=client_dict['created_at']
    )

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can view clients")
    
    clients = await db.users.find({"role": "client"}).to_list(1000)
    return [ClientResponse(
        id=str(client['_id']),
        company_name=client['company_name'],
        phone=client['phone'],
        qr_payment_image=client.get('qr_payment_image'),
        created_at=client['created_at']
    ) for client in clients]

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_update: ClientUpdate, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can update clients")
    
    # Check if phone is taken by another user
    existing = await db.users.find_one({"phone": client_update.phone, "_id": {"$ne": ObjectId(client_id)}})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already exists")
    
    result = await db.users.update_one(
        {"_id": ObjectId(client_id)},
        {"$set": {
            "company_name": client_update.company_name,
            "name": client_update.company_name,
            "phone": client_update.phone,
            "qr_payment_image": client_update.qr_payment_image
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client updated successfully"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can delete clients")
    
    result = await db.users.delete_one({"_id": ObjectId(client_id), "role": "client"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client deleted successfully"}

@api_router.put("/clients/{client_id}/reset-password")
async def reset_client_password(client_id: str, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    
    result = await db.users.update_one(
        {"_id": ObjectId(client_id), "role": "client"},
        {"$set": {"password": hash_password("123456")}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Password reset to 123456 successfully"}

# Sales Report Route
@api_router.get("/sales-report")
async def get_sales_report(date: Optional[str] = None, user = Depends(get_current_user)):
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # If date not provided, use today
    if date:
        report_date = datetime.fromisoformat(date)
    else:
        report_date = datetime.utcnow()
    
    # Get start and end of the day
    start_of_day = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = report_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get all orders for the day
    orders = await orders_coll.find({
        "created_at": {"$gte": start_of_day, "$lte": end_of_day}
    }).to_list(1000)
    
    if not orders:
        return {
            "date": report_date.isoformat(),
            "total_sales": 0,
            "total_orders": 0,
            "cash_sales": 0,
            "qr_sales": 0,
            "total_discount": 0,
            "top_items": []
        }
    
    # Calculate totals
    total_sales = sum(order.get('total', order['subtotal']) for order in orders)
    total_discount = sum(order.get('discount_amount', 0) for order in orders)
    
    # Sales by payment method
    cash_sales = sum(order.get('total', order['subtotal']) for order in orders if order['payment_method'] == 'cash')
    qr_sales = sum(order.get('total', order['subtotal']) for order in orders if order['payment_method'] == 'qr')
    
    # Top items
    item_sales = {}
    for order in orders:
        for item in order['items']:
            item_id = item['item_id']
            item_name = item['name']
            quantity = item['quantity']
            revenue = item['price'] * quantity
            
            if item_id not in item_sales:
                item_sales[item_id] = {
                    'name': item_name,
                    'quantity': 0,
                    'revenue': 0
                }
            
            item_sales[item_id]['quantity'] += quantity
            item_sales[item_id]['revenue'] += revenue
    
    # Sort by quantity and get top 10
    top_items = sorted(
        [{'name': data['name'], 'quantity': data['quantity'], 'revenue': data['revenue']} 
         for data in item_sales.values()],
        key=lambda x: x['quantity'],
        reverse=True
    )[:10]
    
    return {
        "date": report_date.isoformat(),
        "total_sales": total_sales,
        "total_orders": len(orders),
        "cash_sales": cash_sales,
        "qr_sales": qr_sales,
        "total_discount": total_discount,
        "top_items": top_items
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Health check endpoint for deployment
@api_router.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Check MongoDB connection
        await db.command('ping')
        return {
            "status": "healthy",
            "service": "gopos-backend",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
