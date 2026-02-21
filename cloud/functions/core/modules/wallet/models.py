from datetime import datetime
from pydantic import BaseModel, Field

class WalletModel(BaseModel):
    amount: float = Field(0.0, description="Available balance to bet")
    currency: str = Field("GBP", description="Currency of the wallet")
    exposure: float = Field(0.0, description="Current exposure from active bets")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="When the wallet was last updated")
    
    class Config:
        populate_by_name = True
