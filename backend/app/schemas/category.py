from typing import Optional
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    name: Optional[str] = None

class CategoryInDBBase(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class Category(CategoryInDBBase):
    pass

class CategoryAnalytics(BaseModel):
    category_id: int
    category_name: str
    total_products: int
    total_revenue: float
    active_products: int

    model_config = ConfigDict(from_attributes=True)

class CategoryAnalyticsResponse(BaseModel):
    data: list[CategoryAnalytics]
    total_categories_analyzed: int
    overall_revenue: float