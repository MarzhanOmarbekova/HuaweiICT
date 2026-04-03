"""
VoltAI Lightweight Blockchain Module
Implements a custom chain with SHA-256 hashing, compatible with
Huawei BCS (Blockchain Service) for optional cloud anchoring.
"""

import hashlib
import json
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class Transaction:
    transaction_id: str
    seller_id: int
    buyer_id: int
    energy_amount: float       # kWh
    price_per_kwh: float
    total_price: float
    contract_id: Optional[str]
    timestamp: float
    tx_type: str               # "trade" | "mint" | "burn"
    status: str                # "pending" | "confirmed" | "failed"


class Block:
    def __init__(
        self,
        index: int,
        transactions: List[Dict],
        previous_hash: str,
        timestamp: Optional[float] = None,
    ):
        self.index = index
        self.timestamp = timestamp or time.time()
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = 0
        self.hash = self.compute_hash()

    def compute_hash(self) -> str:
        block_data = {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
        }
        block_string = json.dumps(block_data, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> Dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "hash": self.hash,
        }


class VoltAIBlockchain:
    DIFFICULTY = 2  # number of leading zeros required

    def __init__(self):
        self.chain: List[Block] = []
        self.pending_transactions: List[Dict] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(
            index=0,
            transactions=[],
            previous_hash="0" * 64,
            timestamp=1700000000.0,
        )
        self.chain.append(genesis)

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def proof_of_work(self, block: Block) -> str:
        block.nonce = 0
        computed = block.compute_hash()
        while not computed.startswith("0" * self.DIFFICULTY):
            block.nonce += 1
            computed = block.compute_hash()
        return computed

    def add_transaction(self, tx: Dict) -> str:
        """Add a transaction to pending pool, return tx_id."""
        self.pending_transactions.append(tx)
        return tx.get("transaction_id", "")

    def mine_pending_transactions(self) -> Optional[Block]:
        """Mine a new block with all pending transactions."""
        if not self.pending_transactions:
            return None

        new_block = Block(
            index=len(self.chain),
            transactions=self.pending_transactions.copy(),
            previous_hash=self.last_block.hash,
        )
        new_block.hash = self.proof_of_work(new_block)
        self.chain.append(new_block)
        self.pending_transactions = []
        return new_block

    def is_chain_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.hash != current.compute_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
        return True

    def get_chain_data(self) -> List[Dict]:
        return [block.to_dict() for block in self.chain]

    def find_transaction(self, tx_id: str) -> Optional[Dict]:
        for block in self.chain:
            for tx in block.transactions:
                if tx.get("transaction_id") == tx_id:
                    return {"block_index": block.index, "block_hash": block.hash, "transaction": tx}
        return None


# Module-level singleton (in production use Redis/DB persistence)
_blockchain_instance: Optional[VoltAIBlockchain] = None


def get_blockchain() -> VoltAIBlockchain:
    global _blockchain_instance
    if _blockchain_instance is None:
        _blockchain_instance = VoltAIBlockchain()
    return _blockchain_instance
