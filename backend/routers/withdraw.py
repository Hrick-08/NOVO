# routers/withdraw.py
# pip install web3

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from web3 import Web3
from db import get_db
from models import User, WithdrawLog
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/withdraw", tags=["withdraw"])

# ── Config ────────────────────────────────────────────────────────────────────
RPC_URL          = os.getenv("RPC_URL")
PRIVATE_KEY      = os.getenv("WALLET_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

# Conversion: how many nova coins = 1 token
# e.g. COINS_PER_TOKEN=100 means 100 coins → 1 token
COINS_PER_TOKEN  = int(os.getenv("COINS_PER_TOKEN", "100"))

# ── ERC-20 minimal ABI ────────────────────────────────────────────────────────
ERC20_ABI = [
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "_to",    "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
    },
    {
        "name": "decimals",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
    },
]


def _get_web3_clients():
    """Returns (w3, account, contract) or raises HTTPException with a clear message."""
    missing = []
    if not RPC_URL:          missing.append("RPC_URL")
    if not PRIVATE_KEY:      missing.append("WALLET_PRIVATE_KEY")
    if not CONTRACT_ADDRESS: missing.append("CONTRACT_ADDRESS")

    if missing:
        msg = f"Missing environment variables: {', '.join(missing)}"
        logger.error(msg)
        raise HTTPException(status_code=500, detail=msg)

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        msg = f"Cannot connect to RPC node at {RPC_URL}"
        logger.error(msg)
        raise HTTPException(status_code=500, detail=msg)

    key = PRIVATE_KEY if PRIVATE_KEY.startswith("0x") else f"0x{PRIVATE_KEY}"
    try:
        account = w3.eth.account.from_key(key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid WALLET_PRIVATE_KEY: {e}")

    if not Web3.is_address(CONTRACT_ADDRESS):
        raise HTTPException(status_code=500, detail=f"Invalid CONTRACT_ADDRESS: {CONTRACT_ADDRESS}")

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=ERC20_ABI,
    )
    return w3, account, contract


# ── Schemas ───────────────────────────────────────────────────────────────────

class WithdrawRequest(BaseModel):
    to_address: str    # recipient public wallet address
    amount:     float  # token amount to withdraw (not coins)


class WithdrawResponse(BaseModel):
    tx_hash:         str
    from_address:    str
    to_address:      str
    amount:          float
    coins_spent:     int
    remaining_coins: int


# ── Diagnostic endpoint ───────────────────────────────────────────────────────

@router.get("/status")
def withdraw_status():
    issues = []
    if not RPC_URL:          issues.append("RPC_URL not set")
    if not PRIVATE_KEY:      issues.append("WALLET_PRIVATE_KEY not set")
    if not CONTRACT_ADDRESS: issues.append("CONTRACT_ADDRESS not set")

    if issues:
        return {"ok": False, "issues": issues}

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    connected = w3.is_connected()
    return {
        "ok":               connected,
        "rpc_connected":    connected,
        "contract_address": CONTRACT_ADDRESS,
        "coins_per_token":  COINS_PER_TOKEN,
        "issues":           issues,
    }


# ── Withdraw history for a user ───────────────────────────────────────────────

@router.get("/history")
def withdraw_history(
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(WithdrawLog)
        .filter(WithdrawLog.user_id == x_user_id)
        .order_by(WithdrawLog.created_at.desc())
        .all()
    )
    return [
        {
            "id":           w.id,
            "to_address":   w.to_address,
            "amount":       w.amount,
            "coins_spent":  w.coins_spent,
            "tx_hash":      w.tx_hash,
            "status":       w.status,
            "created_at":   w.created_at.isoformat(),
        }
        for w in logs
    ]


# ── Main withdraw route ───────────────────────────────────────────────────────

@router.post("", response_model=WithdrawResponse)
async def withdraw(
    body: WithdrawRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    # ── 1. Validate inputs ────────────────────────────────────────────────────
    if not Web3.is_address(body.to_address):
        raise HTTPException(status_code=400, detail="Invalid recipient wallet address")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    # ── 2. Look up user and check coin balance ────────────────────────────────
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    coins_required = int(body.amount * COINS_PER_TOKEN)
    if user.nova_coins < coins_required:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Nova Coins. You have {user.nova_coins}, need {coins_required} ({COINS_PER_TOKEN} coins = 1 token).",
        )

    # ── 3. Pre-deduct coins and log as pending (so double-clicks can't drain) ─
    user.nova_coins -= coins_required
    log = WithdrawLog(
        user_id=    x_user_id,
        to_address= body.to_address,
        amount=     body.amount,
        coins_spent=coins_required,
        status=     "pending",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # ── 4. Send blockchain transaction ────────────────────────────────────────
    try:
        w3, account, contract = _get_web3_clients()

        decimals   = contract.functions.decimals().call()
        raw_amount = int(body.amount * (10 ** decimals))
        to_checksum = Web3.to_checksum_address(body.to_address)
        key = PRIVATE_KEY if PRIVATE_KEY.startswith("0x") else f"0x{PRIVATE_KEY}"

        txn = contract.functions.transfer(
            to_checksum, raw_amount,
        ).build_transaction({
            "from":     account.address,
            "nonce":    w3.eth.get_transaction_count(account.address),
            "gas":      200_000,
            "gasPrice": w3.to_wei("10", "gwei"),
        })

        signed  = w3.eth.account.sign_transaction(txn, key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

        # ── 5. Mark log as success ────────────────────────────────────────────
        log.tx_hash = tx_hash.hex()
        log.status  = "success"
        db.commit()

        logger.info(f"Withdraw success: user={x_user_id} tx={tx_hash.hex()} coins=-{coins_required}")

        return WithdrawResponse(
            tx_hash=         tx_hash.hex(),
            from_address=    account.address,
            to_address=      to_checksum,
            amount=          body.amount,
            coins_spent=     coins_required,
            remaining_coins= user.nova_coins,
        )

    except HTTPException:
        # Config error — refund coins, mark log failed
        user.nova_coins += coins_required
        log.status = "failed"
        db.commit()
        raise

    except Exception as e:
        # Blockchain error — refund coins, mark log failed
        user.nova_coins += coins_required
        log.status = "failed"
        db.commit()
        logger.error(f"Withdraw failed for user={x_user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))