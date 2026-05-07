# app/services/tickets.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional

# IMPORTANTE: Importe o modelo com o alias 'TicketModel' para bater com o seu código
from app.models.tickets import Ticket as TicketModel 
from app.crud import tickets as crud
from app.schemas import tickets as schemas

class TicketService:
    @staticmethod
    def get_ticket(db: Session, ticket_id: int):
        return crud.get_ticket(db=db, ticket_id=ticket_id)

    @staticmethod
    def get_tickets_with_filters(
        db: Session, 
        skip: int, 
        limit: int, 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None
    ):
        """
        Atende ao requisito de filtro de período do case[cite: 133].
        """
        return crud.get_tickets(
            db=db, 
            skip=skip, 
            limit=limit, 
            start_date=start_date, 
            end_date=end_date
        )

    @staticmethod
    def create_ticket(db: Session, ticket_in: schemas.TicketCreate):
        return crud.create_ticket(db=db, ticket=ticket_in)

    @staticmethod
    def update_ticket(db: Session, ticket_id: int, ticket_in: schemas.TicketUpdate):
        return crud.update_ticket(db=db, ticket_id=ticket_id, ticket=ticket_in)

    @staticmethod
    def delete_ticket(db: Session, ticket_id: int):
        return crud.delete_ticket(db=db, ticket_id=ticket_id)

    @staticmethod
    def get_client_support_summary(db: Session, client_id: str):
        """
        Lógica para a Visão 360 da Fernanda (CS): Consolida métricas de suporte.
        Utiliza campos da camada Gold como sentiment e resolution_time.
        """
        # Agora o TicketModel está definido pelo import no topo!
        tickets = db.query(TicketModel).filter(TicketModel.client_id == client_id).all()
        
        total = len(tickets)
        if total == 0:
            return {"total_tickets": 0, "history": []}

        # Calcula métricas simples para o dashboard
        resolved = [t for t in tickets if t.status == "Resolvido"]
        avg_res = sum([t.resolution_time or 0 for t in tickets]) / total

        return {
            "total_tickets": total,
            "resolved_count": len(resolved),
            "average_resolution_time": round(avg_res, 2),
            "history": tickets
        }