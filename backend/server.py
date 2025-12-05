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

# MongoDB connection - supports both local and Atlas
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'gopos_db')

# Configure connection parameters for production Atlas
client_params = {
    'serverSelectionTimeoutMS': 5000,  # 5 second timeout for production
    'connectTimeoutMS': 10000,
    'socketTimeoutMS': 45000,
}

# For Atlas connections, enable retryWrites
if 'mongodb+srv://' in mongo_url or 'mongodb.net' in mongo_url:
    client_params['retryWrites'] = True
    client_params['w'] = 'majority'

client = AsyncIOMotorClient(mongo_url, **client_params)
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
        'orders': f'orders_{user_id}',
        'modifiers': f'modifiers_{user_id}'
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

class Modifier(BaseModel):
    name: str
    cost: float
    category_ids: List[str]  # can belong to multiple categories

class ModifierResponse(BaseModel):
    id: str
    name: str
    cost: float
    category_ids: List[str]
    created_at: datetime

class OrderItemModifier(BaseModel):
    modifier_id: str
    name: str
    cost: float

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    modifiers: Optional[List[OrderItemModifier]] = []  # modifiers applied to this item

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
    
    # Get category names - Fixed N+1 query by fetching all categories in one query
    category_ids = list(set([item['category_id'] for item in items]))
    categories = {}
    if category_ids:
        # Fetch all categories in a single query using $in operator
        categories_list = await categories_coll.find({
            "_id": {"$in": [ObjectId(cid) for cid in category_ids]}
        }).to_list(len(category_ids))
        categories = {str(cat['_id']): cat['name'] for cat in categories_list}
    
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

# Modifier Routes
@api_router.post("/modifiers", response_model=ModifierResponse)
async def create_modifier(modifier: Modifier, user = Depends(get_current_user)):
    """Create a new modifier for multiple categories"""
    collections = get_client_collections(str(user['_id']))
    modifiers_coll = db[f"modifiers_{str(user['_id'])}"]
    categories_coll = db[collections['categories']]
    
    # Verify all categories exist
    for category_id in modifier.category_ids:
        category = await categories_coll.find_one({"_id": ObjectId(category_id)})
        if not category:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
    
    # Check for duplicate modifier name
    existing = await modifiers_coll.find_one({"name": modifier.name})
    if existing:
        raise HTTPException(status_code=400, detail="Modifier name already exists")
    
    modifier_dict = modifier.dict()
    modifier_dict['created_at'] = datetime.utcnow()
    result = await modifiers_coll.insert_one(modifier_dict)
    
    modifier_dict['id'] = str(result.inserted_id)
    return ModifierResponse(**modifier_dict)

@api_router.get("/modifiers", response_model=List[ModifierResponse])
async def get_modifiers(category_id: Optional[str] = None, user = Depends(get_current_user)):
    """Get all modifiers, optionally filtered by category"""
    modifiers_coll = db[f"modifiers_{str(user['_id'])}"]
    
    query = {}
    if category_id:
        query['category_ids'] = category_id  # Check if category_id is in the array
    
    modifiers = await modifiers_coll.find(query).to_list(1000)
    return [ModifierResponse(
        id=str(mod['_id']),
        name=mod['name'],
        cost=mod['cost'],
        # Handle both old (category_id) and new (category_ids) format
        category_ids=mod.get('category_ids', [mod['category_id']] if 'category_id' in mod else []),
        created_at=mod['created_at']
    ) for mod in modifiers]

@api_router.put("/modifiers/{modifier_id}")
async def update_modifier(modifier_id: str, modifier: Modifier, user = Depends(get_current_user)):
    """Update an existing modifier"""
    collections = get_client_collections(str(user['_id']))
    modifiers_coll = db[f"modifiers_{str(user['_id'])}"]
    categories_coll = db[collections['categories']]
    
    # Verify all categories exist
    for category_id in modifier.category_ids:
        category = await categories_coll.find_one({"_id": ObjectId(category_id)})
        if not category:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found")
    
    # Check for duplicate name (excluding current modifier)
    existing = await modifiers_coll.find_one({
        "name": modifier.name,
        "_id": {"$ne": ObjectId(modifier_id)}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Modifier name already exists")
    
    result = await modifiers_coll.update_one(
        {"_id": ObjectId(modifier_id)},
        {"$set": {
            "name": modifier.name,
            "cost": modifier.cost,
            "category_ids": modifier.category_ids
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Modifier not found")
    
    return {"message": "Modifier updated successfully"}

@api_router.delete("/modifiers/{modifier_id}")
async def delete_modifier(modifier_id: str, user = Depends(get_current_user)):
    """Delete a modifier"""
    modifiers_coll = db[f"modifiers_{str(user['_id'])}"]
    
    result = await modifiers_coll.delete_one({"_id": ObjectId(modifier_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modifier not found")
    return {"message": "Modifier deleted successfully"}

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
    """Return specific items from an order"""
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Support both single item_id and multiple items array
    items_to_return = request.get('items', [])
    single_item_id = request.get('item_id')
    
    if single_item_id:
        # Legacy support: single item_id
        items_to_return = [{'item_id': single_item_id}]
    elif not items_to_return:
        raise HTTPException(status_code=400, detail="item_id or items array is required")
    
    # Get the order
    order = await orders_coll.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('status') == 'refunded':
        raise HTTPException(status_code=400, detail="Cannot return items from refunded order")
    
    # Mark specified items as returned
    item_ids_to_return = [item['item_id'] for item in items_to_return]
    items_marked = 0
    
    for order_item in order['items']:
        if order_item['item_id'] in item_ids_to_return:
            if order_item.get('returned'):
                raise HTTPException(status_code=400, detail=f"Item {order_item['name']} already returned")
            order_item['returned'] = True
            items_marked += 1
    
    if items_marked == 0:
        raise HTTPException(status_code=404, detail="No matching items found in order")
    
    # Update the order
    await orders_coll.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"items": order['items']}}
    )
    
    return {"message": f"{items_marked} item(s) returned successfully"}

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

@api_router.post("/orders/{order_id}/return")
async def return_order(order_id: str, user = Depends(get_current_user)):
    """Return an entire order (same as refund)"""
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Get the order
    order = await orders_coll.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('status') == 'refunded':
        raise HTTPException(status_code=400, detail="Order already returned")
    
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
    
    return {"message": "Order returned successfully"}

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
@api_router.get("/orders-list")
async def get_orders_list(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get detailed list of orders with filter options"""
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Determine date range
    if start_date and end_date:
        start_of_period = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_of_period = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        report_date = datetime.utcnow()
        start_of_period = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_period = report_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Build query
    query = {"created_at": {"$gte": start_of_period, "$lte": end_of_period}}
    
    # Filter by status if provided
    if status and status != 'all':
        if status == 'completed':
            query['status'] = {'$ne': 'refunded'}
        elif status == 'refunded':
            query['status'] = 'refunded'
    
    # Get orders
    orders = await orders_coll.find(query).sort('created_at', -1).to_list(1000)
    
    # Format response
    orders_list = []
    for order in orders:
        orders_list.append({
            'id': str(order['_id']),
            'order_number': order['order_number'],
            'items': order['items'],
            'subtotal': order['subtotal'],
            'total': order.get('total', order['subtotal']),
            'payment_method': order['payment_method'],
            'sales_person': order.get('sales_person_name', 'Staff'),
            'status': order.get('status', 'completed'),
            'created_at': order['created_at'].isoformat(),
            'refunded_at': order.get('refunded_at').isoformat() if order.get('refunded_at') else None
        })
    
    return orders_list

@api_router.get("/sales-report")
async def get_sales_report(
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    filter_type: Optional[str] = 'all',
    user = Depends(get_current_user)
):
    collections = get_client_collections(str(user['_id']))
    orders_coll = db[collections['orders']]
    
    # Determine date range
    if start_date and end_date:
        start_of_period = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_of_period = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    elif date:
        report_date = datetime.fromisoformat(date)
        start_of_period = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_period = report_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        report_date = datetime.utcnow()
        start_of_period = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_period = report_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get all orders for the period
    orders = await orders_coll.find({
        "created_at": {"$gte": start_of_period, "$lte": end_of_period}
    }).to_list(10000)
    
    if not orders:
        return {
            "total_sales": 0,
            "total_orders": 0,
            "qty_sold": 0,
            "return_sales": 0,
            "cash_sales": 0,
            "qr_sales": 0,
            "total_discount": 0,
            "top_items": []
        }
    
    # Separate orders by status
    completed_orders = [o for o in orders if o.get('status') != 'refunded']
    refunded_orders = [o for o in orders if o.get('status') == 'refunded']
    
    # Calculate totals
    total_sales = sum(order.get('total', order['subtotal']) for order in completed_orders)
    return_sales = sum(order.get('total', order['subtotal']) for order in refunded_orders)
    total_discount = sum(order.get('discount_amount', 0) for order in completed_orders)
    
    # Calculate quantity sold
    qty_sold = sum(
        sum(item['quantity'] for item in order['items'])
        for order in completed_orders
    )
    
    # Sales by payment method (only completed orders)
    cash_sales = sum(order.get('total', order['subtotal']) for order in completed_orders if order['payment_method'] == 'cash')
    qr_sales = sum(order.get('total', order['subtotal']) for order in completed_orders if order['payment_method'] == 'qr')
    
    # Top items (only completed orders)
    item_sales = {}
    for order in completed_orders:
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
        "total_sales": total_sales,
        "total_orders": len(completed_orders),
        "qty_sold": qty_sold,
        "return_sales": return_sales,
        "cash_sales": cash_sales,
        "qr_sales": qr_sales,
        "total_discount": total_discount,
        "top_items": top_items
    }

# Health check endpoint for deployment (must be before include_router)
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
        logging.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Root-level health check for Kubernetes (without /api prefix)
@app.get("/health")
async def root_health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Quick health check without DB ping for faster response
        return {
            "status": "healthy",
            "service": "gopos-backend"
        }
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

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

@app.on_event("startup")
async def startup_db_client():
    """Verify MongoDB connection on startup and create indexes"""
    try:
        # Test database connection
        await db.command('ping')
        logger.info(f"✅ Successfully connected to MongoDB: {db_name}")
        logger.info(f"📊 MongoDB URL: {mongo_url.split('@')[-1] if '@' in mongo_url else mongo_url}")
        
        # Create indexes for performance optimization on super_admin collections
        users_coll = db["users"]
        orders_coll = db["orders_super_admin"]
        
        # Index on phone field for fast login lookups (unique)
        try:
            await users_coll.create_index("phone", unique=True)
            logger.info("✅ Created index on users.phone")
        except Exception as idx_error:
            # Index might already exist, that's fine
            logger.info(f"ℹ️  Index on users.phone: {str(idx_error)}")
        
        # Index on created_at field for order sorting and date range queries
        try:
            await orders_coll.create_index([("created_at", -1)])
            logger.info("✅ Created index on orders.created_at")
        except Exception as idx_error:
            # Index might already exist, that's fine
            logger.info(f"ℹ️  Index on orders.created_at: {str(idx_error)}")
        
        logger.info("✅ Database indexes setup complete")
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB or create indexes: {str(e)}")
        logger.error("Application will continue but may not function properly")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    try:
        client.close()
        logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {str(e)}")
