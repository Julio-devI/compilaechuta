import unicodedata
import re
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryAnalytics, CategoryAnalyticsResponse


def generate_slug(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text

async def get(db: AsyncSession, id: int) -> Optional[Category]:
    result = await db.execute(select(Category).filter(Category.id == id))
    return result.scalars().first()

async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Category]:
    result = await db.execute(select(Category).filter(Category.slug == slug))
    return result.scalars().first()

async def get_multi(
    db: AsyncSession, *, skip: int = 0, limit: int = 100, name: Optional[str] = None, slug: Optional[str] = None
) -> List[Category]:
    query = select(Category)
    
    if name:
        query = query.filter(Category.name.ilike(f"%{name}%"))
    if slug:
        query = query.filter(Category.slug == slug)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())

async def create(db: AsyncSession, *, obj_in: CategoryCreate) -> Category:
    obj_in_data = obj_in.model_dump()
    
    if not obj_in_data.get("slug"):
        obj_in_data["slug"] = generate_slug(obj_in_data["name"])
        
    db_obj = Category(**obj_in_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update(db: AsyncSession, *, db_obj: Category, obj_in: CategoryUpdate) -> Category:
    obj_data = db_obj.__dict__
    update_data = obj_in.model_dump(exclude_unset=True)
    
    if "name" in update_data and not update_data.get("slug"):
        update_data["slug"] = generate_slug(update_data["name"])
        
    for field in obj_data:
        if field in update_data:
            setattr(db_obj, field, update_data[field])
            
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def remove(db: AsyncSession, *, id: int) -> Optional[Category]:
    result = await db.execute(select(Category).filter(Category.id == id))
    obj = result.scalars().first()
    if obj:
        await db.delete(obj)
        await db.commit()
    return obj

# Analitic data MOCK for category
async def get_analytics(
    db: AsyncSession, *, skip: int = 0, limit: int = 100
) -> CategoryAnalyticsResponse:
    
    result = await db.execute(select(Category).offset(skip).limit(limit))
    categories = result.scalars().all()
    
    analytics_data = []
    overall_revenue = 0.0
    
    for cat in categories:
        mock_total_products = cat.id * 15
        mock_active_products = int(cat.id * 12.5)
        mock_revenue = round(cat.id * 1500.75, 2)
        
        overall_revenue += mock_revenue
        
        analytics_data.append(
            CategoryAnalytics(
                category_id=cat.id,
                category_name=cat.name,
                total_products=mock_total_products,
                active_products=mock_active_products,
                total_revenue=mock_revenue
            )
        )
        
    return CategoryAnalyticsResponse(
        data=analytics_data,
        total_categories_analyzed=len(analytics_data),
        overall_revenue=round(overall_revenue, 2)
    )