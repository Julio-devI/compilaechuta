from pydantic import BaseModel, Field
from datetime import date


class TimeResponse(BaseModel):
    id_data: date = Field(..., description="Data ID (YYYY-MM-DD)")
    ano: int = Field(..., description="Year")
    mes: int = Field(..., description="Month")
    dia: int = Field(..., description="Day")
    trimestre: int = Field(..., description="Quarter")
    dia_semana_num: int = Field(..., description="Day of the week (number)")
    dia_do_ano: int = Field(..., description="Day of the year")
    semana_do_ano: int = Field(..., description="Week of the year")
    nome_mes: str = Field(..., description="Month name")
    nome_dia_semana: str = Field(..., description="Day of the week name")
    ano_mes: str = Field(..., description="Year-Month")
    trismestre_label: str = Field(..., description="Quarter label")
    fim_de_semana: bool = Field(..., description="Weekend flag")


class TimeListOut(BaseModel):
    total: int
    skip: int
    limit: int
    data: list[TimeResponse]