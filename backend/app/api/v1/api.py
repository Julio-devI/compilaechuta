from fastapi import APIRouter

from app.api.v1 import clients, tickets, products, dashboard

api_router = APIRouter()

api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
