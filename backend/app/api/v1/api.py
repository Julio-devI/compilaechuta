from fastapi import APIRouter

from app.api.v1 import (
  clients,
  tickets,
  products,
  category,
  dashboard,
  orders,
  orders_evaluation,
)

api_router = APIRouter()

api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(category.router, prefix="/categories", tags=["categories"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(orders_evaluation.router, prefix="/orders-evaluation", tags=["Orders Evaluation"])