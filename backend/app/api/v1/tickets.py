from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.api import deps
from app.crud import tickets as crud
from app.schemas import tickets as schemas

router = APIRouter()

@router.post("/", response_model=schemas.Ticket)
def create_ticket(ticket: schemas.TicketCreate, db: Session = Depends(deps.get_db)):
    return crud.create_ticket(db=db, ticket=ticket)

@router.get("/", response_model=List[schemas.Ticket])
def read_tickets(
    skip: int = 0, 
    limit: int = 100, 
    start_date: datetime = Query(None), 
    end_date: datetime = Query(None),
    db: Session = Depends(deps.get_db)
):
    return crud.get_tickets(db, skip=skip, limit=limit, start_date=start_date, end_date=end_date)

@router.patch("/{ticket_id}", response_model=schemas.Ticket)
def update_ticket(ticket_id: int, ticket: schemas.TicketUpdate, db: Session = Depends(deps.get_db)):
    db_ticket = crud.update_ticket(db, ticket_id=ticket_id, ticket=ticket)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return db_ticket

@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(deps.get_db)):
    success = crud.delete_ticket(db, ticket_id=ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return {"message": "Ticket deletado com sucesso"}