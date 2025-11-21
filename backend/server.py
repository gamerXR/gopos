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
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
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

# Pydantic Models
class LoginRequest(BaseModel):
    phone: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

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
    stock: int

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    category_name: str
    price: float
    stock: int
    created_at: datetime

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    items: List[OrderItem]
    subtotal: float
    payment_method: str  # "cash" or "qr"
    qr_image: Optional[str] = None  # base64 image for QR payment

class OrderResponse(BaseModel):
    id: str
    items: List[OrderItem]
    subtotal: float
    payment_method: str
    qr_image: Optional[str] = None
    created_at: datetime
    order_number: str

# Initialize default user on startup
@app.on_event("startup")
async def startup_event():
    # Check if default user exists
    existing_user = await db.users.find_one({"phone": "8889999"})
    if not existing_user:
        # Create default user
        default_user = {
            "phone": "8889999",
            "password": hash_password("123456"),
            "role": "admin",
            "name": "Admin User",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(default_user)
        logger.info("Default user created")

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
            "name": user['name']
        }
    )

# Category Routes
@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: Category, user = Depends(get_current_user)):
    category_dict = category.dict()
    category_dict['created_at'] = datetime.utcnow()
    result = await db.categories.insert_one(category_dict)
    category_dict['id'] = str(result.inserted_id)
    return CategoryResponse(**category_dict)

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(user = Depends(get_current_user)):
    categories = await db.categories.find().to_list(1000)
    return [CategoryResponse(
        id=str(cat['_id']),
        name=cat['name'],
        created_at=cat['created_at']
    ) for cat in categories]

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user = Depends(get_current_user)):
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    # Also delete all items in this category
    await db.items.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# Item Routes
@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: Item, user = Depends(get_current_user)):
    # Verify category exists
    category = await db.categories.find_one({"_id": ObjectId(item.category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    item_dict = item.dict()
    item_dict['created_at'] = datetime.utcnow()
    result = await db.items.insert_one(item_dict)
    
    return ItemResponse(
        id=str(result.inserted_id),
        name=item_dict['name'],
        category_id=item_dict['category_id'],
        category_name=category['name'],
        price=item_dict['price'],
        stock=item_dict['stock'],
        created_at=item_dict['created_at']
    )

@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(category_id: Optional[str] = None, user = Depends(get_current_user)):
    query = {}
    if category_id:
        query['category_id'] = category_id
    
    items = await db.items.find(query).to_list(1000)
    
    # Get category names
    category_ids = list(set([item['category_id'] for item in items]))
    categories = {}
    for cat_id in category_ids:
        cat = await db.categories.find_one({"_id": ObjectId(cat_id)})
        if cat:
            categories[cat_id] = cat['name']
    
    return [ItemResponse(
        id=str(item['_id']),
        name=item['name'],
        category_id=item['category_id'],
        category_name=categories.get(item['category_id'], 'Unknown'),
        price=item['price'],
        stock=item['stock'],
        created_at=item['created_at']
    ) for item in items]

@api_router.put("/items/{item_id}/stock")
async def update_item_stock(item_id: str, stock: int, user = Depends(get_current_user)):
    result = await db.items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"stock": stock}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Stock updated"}

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user = Depends(get_current_user)):
    result = await db.items.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# Order Routes
@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: Order, user = Depends(get_current_user)):
    # Update stock for each item
    for item in order.items:
        db_item = await db.items.find_one({"_id": ObjectId(item.item_id)})
        if not db_item:
            raise HTTPException(status_code=404, detail=f"Item {item.name} not found")
        
        new_stock = db_item['stock'] - item.quantity
        if new_stock < 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.name}")
        
        await db.items.update_one(
            {"_id": ObjectId(item.item_id)},
            {"$set": {"stock": new_stock}}
        )
    
    # Get order number (count + 1)
    order_count = await db.orders.count_documents({})
    order_number = f"ORD{str(order_count + 1).zfill(5)}"
    
    order_dict = order.dict()
    order_dict['created_at'] = datetime.utcnow()
    order_dict['created_by'] = str(user['_id'])
    order_dict['order_number'] = order_number
    
    result = await db.orders.insert_one(order_dict)
    
    return OrderResponse(
        id=str(result.inserted_id),
        items=order.items,
        subtotal=order.subtotal,
        payment_method=order.payment_method,
        qr_image=order.qr_image,
        created_at=order_dict['created_at'],
        order_number=order_number
    )

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(user = Depends(get_current_user)):
    orders = await db.orders.find().sort("created_at", -1).to_list(100)
    return [OrderResponse(
        id=str(order['_id']),
        items=order['items'],
        subtotal=order['subtotal'],
        payment_method=order['payment_method'],
        qr_image=order.get('qr_image'),
        created_at=order['created_at'],
        order_number=order['order_number']
    ) for order in orders]

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
