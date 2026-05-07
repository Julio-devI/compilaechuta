from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.tickets import Ticket as TicketModel
from app.schemas.tickets import TicketCreate, TicketUpdate
from datetime import datetime

def get_ticket(db: Session, ticket_id: int):
    return db.query(TicketModel).filter(TicketModel.id == ticket_id).first()

def get_tickets(db: Session, skip: int = 0, limit: int = 100, 
                start_date: datetime = None, end_date: datetime = None):
    query = db.query(TicketModel)
    
    # Requisito: Filtro de período
    if start_date and end_date:
        query = query.filter(and_(TicketModel.created_at >= start_date, 
                                 TicketModel.created_at <= end_date))
    
    return query.offset(skip).limit(limit).all()

def create_ticket(db: Session, ticket: TicketCreate):
    db_ticket = TicketModel(**ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_ticket(db: Session, ticket_id: int, ticket: TicketUpdate):
    db_query = db.query(TicketModel).filter(TicketModel.id == ticket_id)
    db_ticket = db_query.first()
    if db_ticket:
        update_data = ticket.model_dump(exclude_unset=True)
        db_query.update(update_data)
        db.commit()
        db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: int):
    db_ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if db_ticket:
        db.delete(db_ticket)
        db.commit()
        return True
    return False