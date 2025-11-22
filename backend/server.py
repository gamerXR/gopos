from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import aiosqlite
import bcrypt
import jwt
import os
from dotenv import load_dotenv
import shutil
import json

# Load environment variables
load_dotenv()

# Configuration
DB_PATH = os.getenv('DB_PATH', '/app/data/gopos.db')
BACKUP_PATH = os.getenv('BACKUP_PATH', '/app/data/backups')
BACKUP_FILENAME = os.getenv('BACKUP_FILENAME', 'gopos_backup')
JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret-key')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

app = FastAPI(title="GoPos API", version="1.0.0")
security = HTTPBearer()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
async def init_db():
    """Initialize SQLite database with tables"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Users table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                role TEXT DEFAULT 'client',
                company_name TEXT,
                qr_payment_image TEXT,
                client_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Categories table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                client_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, client_id)
            )
        ''')
        
        # Items table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        ''')
        
        # Orders table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                subtotal REAL NOT NULL,
                discount_percentage REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                total REAL NOT NULL,
                payment_method TEXT NOT NULL,
                cash_amount REAL,
                change_amount REAL,
                qr_image TEXT,
                client_id INTEGER NOT NULL,
                created_by INTEGER NOT NULL,
                sales_person_name TEXT,
                status TEXT DEFAULT 'completed',
                refunded_at TIMESTAMP,
                refunded_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (refunded_by) REFERENCES users(id)
            )
        ''')
        
        # Order items table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                returned BOOLEAN DEFAULT 0,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        ''')
        
        await db.commit()
        
        # Create super admin if not exists
        cursor = await db.execute('SELECT id FROM users WHERE role = ?', ('super_admin',))
        admin = await cursor.fetchone()
        if not admin:
            hashed = bcrypt.hashpw('448613'.encode('utf-8'), bcrypt.gensalt())
            await db.execute('''
                INSERT INTO users (phone, password, name, role, company_name)
                VALUES (?, ?, ?, ?, ?)
            ''', ('6737165617', hashed.decode('utf-8'), 'Super Admin', 'super_admin', 'GoPos'))
            await db.commit()
            print("Super admin created: 6737165617 / 448613")

@app.on_event("startup")
async def startup():
    await init_db()
    print(f"Database initialized at {DB_PATH}")

# Pydantic Models
class LoginRequest(BaseModel):
    phone: str
    password: str

class UserCreate(BaseModel):
    phone: str
    password: str
    name: str
    company_name: str
    qr_payment_image: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    phone: str
    name: str
    role: str
    company_name: Optional[str] = None
    qr_payment_image: Optional[str] = None

class Category(BaseModel):
    name: str

class CategoryResponse(BaseModel):
    id: int
    name: str

class Item(BaseModel):
    name: str
    price: float
    category_id: int
    image: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    price: float
    category_id: int
    image: Optional[str] = None

class OrderItem(BaseModel):
    item_id: int
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    items: List[OrderItem]
    subtotal: float
    discount_percentage: float = 0
    discount_amount: float = 0
    total: float
    payment_method: str
    cash_amount: Optional[float] = None
    change_amount: Optional[float] = None
    qr_image: Optional[str] = None

# Helper functions
def create_jwt_token(user_id: int, phone: str, role: str) -> str:
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'phone': phone,
        'role': role,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('SELECT * FROM users WHERE id = ?', (payload['user_id'],))
        user = await cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return dict(user)

# Routes
@app.get("/")
async def root():
    return {"message": "GoPos API", "version": "1.0.0", "database": "SQLite"}

@app.post("/api/login")
async def login(credentials: LoginRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('SELECT * FROM users WHERE phone = ?', (credentials.phone,))
        user = await cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_dict = dict(user)
        if not bcrypt.checkpw(credentials.password.encode('utf-8'), user_dict['password'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_jwt_token(user_dict['id'], user_dict['phone'], user_dict['role'])
        
        return {
            "token": token,
            "user": {
                "id": user_dict['id'],
                "phone": user_dict['phone'],
                "name": user_dict['name'],
                "role": user_dict['role'],
                "company_name": user_dict.get('company_name'),
                "qr_payment_image": user_dict.get('qr_payment_image')
            }
        }

# Super Admin Routes
@app.post("/api/admin/clients")
async def create_client(client: UserCreate, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    hashed = bcrypt.hashpw(client.password.encode('utf-8'), bcrypt.gensalt())
    
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cursor = await db.execute('''
                INSERT INTO users (phone, password, name, role, company_name, qr_payment_image)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (client.phone, hashed.decode('utf-8'), client.name, 'client', 
                  client.company_name, client.qr_payment_image))
            await db.commit()
            client_id = cursor.lastrowid
            
            return {
                "id": client_id,
                "phone": client.phone,
                "name": client.name,
                "company_name": client.company_name,
                "role": "client"
            }
        except aiosqlite.IntegrityError:
            raise HTTPException(status_code=400, detail="Phone number already exists")

@app.get("/api/admin/clients")
async def get_clients(user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('SELECT id, phone, name, company_name, qr_payment_image, created_at FROM users WHERE role = ?', ('client',))
        clients = await cursor.fetchall()
        
        return [dict(client) for client in clients]

@app.put("/api/admin/clients/{client_id}")
async def update_client(client_id: int, client: UserCreate, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    async with aiosqlite.connect(DB_PATH) as db:
        if client.password:
            hashed = bcrypt.hashpw(client.password.encode('utf-8'), bcrypt.gensalt())
            await db.execute('''
                UPDATE users SET phone = ?, password = ?, name = ?, company_name = ?, qr_payment_image = ?
                WHERE id = ?
            ''', (client.phone, hashed.decode('utf-8'), client.name, client.company_name, 
                  client.qr_payment_image, client_id))
        else:
            await db.execute('''
                UPDATE users SET phone = ?, name = ?, company_name = ?, qr_payment_image = ?
                WHERE id = ?
            ''', (client.phone, client.name, client.company_name, client.qr_payment_image, client_id))
        
        await db.commit()
        return {"message": "Client updated successfully"}

@app.delete("/api/admin/clients/{client_id}")
async def delete_client(client_id: int, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('DELETE FROM users WHERE id = ?', (client_id,))
        await db.commit()
        return {"message": "Client deleted successfully"}

@app.post("/api/admin/clients/{client_id}/reset-password")
async def reset_password(client_id: int, user = Depends(get_current_user)):
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    hashed = bcrypt.hashpw('123456'.encode('utf-8'), bcrypt.gensalt())
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('UPDATE users SET password = ? WHERE id = ?', (hashed.decode('utf-8'), client_id))
        await db.commit()
        return {"message": "Password reset to 123456"}

# Category Routes
@app.post("/api/categories")
async def create_category(category: Category, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cursor = await db.execute('''
                INSERT INTO categories (name, client_id) VALUES (?, ?)
            ''', (category.name, user['id']))
            await db.commit()
            return {"id": cursor.lastrowid, "name": category.name}
        except aiosqlite.IntegrityError:
            raise HTTPException(status_code=400, detail="Category already exists")

@app.get("/api/categories")
async def get_categories(user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('SELECT * FROM categories WHERE client_id = ?', (user['id'],))
        categories = await cursor.fetchall()
        return [dict(cat) for cat in categories]

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('DELETE FROM categories WHERE id = ? AND client_id = ?', 
                        (category_id, user['id']))
        await db.commit()
        return {"message": "Category deleted"}

# Item Routes
@app.post("/api/items")
async def create_item(item: Item, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute('''
            INSERT INTO items (name, price, category_id, client_id, image)
            VALUES (?, ?, ?, ?, ?)
        ''', (item.name, item.price, item.category_id, user['id'], item.image))
        await db.commit()
        return {"id": cursor.lastrowid, **item.dict()}

@app.get("/api/items")
async def get_items(user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('SELECT * FROM items WHERE client_id = ?', (user['id'],))
        items = await cursor.fetchall()
        return [dict(item) for item in items]

@app.put("/api/items/{item_id}")
async def update_item(item_id: int, item: Item, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            UPDATE items SET name = ?, price = ?, category_id = ?, image = ?
            WHERE id = ? AND client_id = ?
        ''', (item.name, item.price, item.category_id, item.image, item_id, user['id']))
        await db.commit()
        return {"message": "Item updated"}

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: int, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('DELETE FROM items WHERE id = ? AND client_id = ?', 
                        (item_id, user['id']))
        await db.commit()
        return {"message": "Item deleted"}

# Order Routes
@app.post("/api/orders")
async def create_order(order: Order, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        # Get order count for order number
        cursor = await db.execute('SELECT COUNT(*) FROM orders WHERE client_id = ?', (user['id'],))
        count = await cursor.fetchone()
        order_number = f"ORD{str(count[0] + 1).zfill(5)}"
        
        # Insert order
        cursor = await db.execute('''
            INSERT INTO orders (order_number, subtotal, discount_percentage, discount_amount, 
                              total, payment_method, cash_amount, change_amount, qr_image,
                              client_id, created_by, sales_person_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (order_number, order.subtotal, order.discount_percentage, order.discount_amount,
              order.total, order.payment_method, order.cash_amount, order.change_amount,
              order.qr_image, user['id'], user['id'], user.get('name', 'Staff'), 'completed'))
        
        order_id = cursor.lastrowid
        
        # Insert order items
        for item in order.items:
            await db.execute('''
                INSERT INTO order_items (order_id, item_id, name, price, quantity)
                VALUES (?, ?, ?, ?, ?)
            ''', (order_id, item.item_id, item.name, item.price, item.quantity))
        
        await db.commit()
        
        return {
            "id": order_id,
            "order_number": order_number,
            **order.dict()
        }

@app.get("/api/orders")
async def get_orders(user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute('''
            SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC
        ''', (user['id'],))
        orders = await cursor.fetchall()
        
        result = []
        for order in orders:
            order_dict = dict(order)
            
            # Get items
            cursor = await db.execute('''
                SELECT * FROM order_items WHERE order_id = ?
            ''', (order_dict['id'],))
            items = await cursor.fetchall()
            order_dict['items'] = [dict(item) for item in items]
            
            result.append(order_dict)
        
        return result

@app.post("/api/orders/{order_id}/return-item")
async def return_item(order_id: int, request: dict, user = Depends(get_current_user)):
    item_id = request.get('item_id')
    if not item_id:
        raise HTTPException(status_code=400, detail="item_id is required")
    
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        # Check order status
        cursor = await db.execute('SELECT status FROM orders WHERE id = ? AND client_id = ?', 
                                 (order_id, user['id']))
        order = await cursor.fetchone()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order['status'] == 'refunded':
            raise HTTPException(status_code=400, detail="Cannot return items from refunded order")
        
        # Update item
        await db.execute('''
            UPDATE order_items SET returned = 1 
            WHERE order_id = ? AND item_id = ? AND returned = 0
        ''', (order_id, item_id))
        
        await db.commit()
        return {"message": "Item returned successfully"}

@app.post("/api/orders/{order_id}/refund")
async def refund_order(order_id: int, user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        cursor = await db.execute('SELECT status FROM orders WHERE id = ? AND client_id = ?', 
                                 (order_id, user['id']))
        order = await cursor.fetchone()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order['status'] == 'refunded':
            raise HTTPException(status_code=400, detail="Order already refunded")
        
        # Update order status
        await db.execute('''
            UPDATE orders SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP, refunded_by = ?
            WHERE id = ?
        ''', (user['id'], order_id))
        
        # Mark all items as returned
        await db.execute('UPDATE order_items SET returned = 1 WHERE order_id = ?', (order_id,))
        
        await db.commit()
        return {"message": "Order refunded successfully"}

@app.get("/api/sales-report")
async def get_sales_report(user = Depends(get_current_user)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        # Today's sales
        cursor = await db.execute('''
            SELECT SUM(total) as total_sales, COUNT(*) as total_orders
            FROM orders 
            WHERE client_id = ? AND DATE(created_at) = DATE('now') AND status = 'completed'
        ''', (user['id'],))
        today = await cursor.fetchone()
        
        # Sales by payment method
        cursor = await db.execute('''
            SELECT payment_method, SUM(total) as total, COUNT(*) as count
            FROM orders
            WHERE client_id = ? AND DATE(created_at) = DATE('now') AND status = 'completed'
            GROUP BY payment_method
        ''', (user['id'],))
        by_payment = await cursor.fetchall()
        
        return {
            "date": datetime.now().date().isoformat(),
            "total_sales": today['total_sales'] or 0,
            "total_orders": today['total_orders'] or 0,
            "by_payment_method": [dict(row) for row in by_payment]
        }

# Backup Routes
@app.post("/api/backup/create")
async def create_backup(user = Depends(get_current_user)):
    """Create a backup of the database"""
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can create backups")
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"{BACKUP_FILENAME}_{timestamp}.db"
        backup_full_path = os.path.join(BACKUP_PATH, backup_file)
        
        # Create backup directory if not exists
        os.makedirs(BACKUP_PATH, exist_ok=True)
        
        # Copy database file
        shutil.copy2(DB_PATH, backup_full_path)
        
        return {
            "message": "Backup created successfully",
            "filename": backup_file,
            "path": backup_full_path,
            "timestamp": timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@app.get("/api/backup/list")
async def list_backups(user = Depends(get_current_user)):
    """List all available backups"""
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can list backups")
    
    try:
        if not os.path.exists(BACKUP_PATH):
            return {"backups": []}
        
        backups = []
        for filename in os.listdir(BACKUP_PATH):
            if filename.startswith(BACKUP_FILENAME) and filename.endswith('.db'):
                filepath = os.path.join(BACKUP_PATH, filename)
                stat = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return {"backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")

@app.post("/api/backup/restore/{filename}")
async def restore_backup(filename: str, user = Depends(get_current_user)):
    """Restore database from a backup"""
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can restore backups")
    
    try:
        backup_full_path = os.path.join(BACKUP_PATH, filename)
        
        if not os.path.exists(backup_full_path):
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        # Create a backup of current database before restoring
        current_backup = f"{BACKUP_FILENAME}_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(DB_PATH, os.path.join(BACKUP_PATH, current_backup))
        
        # Restore the backup
        shutil.copy2(backup_full_path, DB_PATH)
        
        return {
            "message": "Backup restored successfully",
            "restored_from": filename,
            "current_backup": current_backup
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@app.delete("/api/backup/{filename}")
async def delete_backup(filename: str, user = Depends(get_current_user)):
    """Delete a backup file"""
    if user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admin can delete backups")
    
    try:
        backup_full_path = os.path.join(BACKUP_PATH, filename)
        
        if not os.path.exists(backup_full_path):
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        os.remove(backup_full_path)
        return {"message": "Backup deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
