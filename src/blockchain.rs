use crate::block::Block;
use crate::transaction::Transaction;

pub struct Blockchain {
    pub chain: Vec<Block>,
    pub pending_transactions: Vec<Transaction>,
    pub difficulty: usize,
    pub mining_reward: f64,
}

impl Blockchain {
    pub fn new() -> Self {
        let mut blockchain = Self {
            chain: vec![],
            pending_transactions: vec![],
            difficulty: 2,
            mining_reward: 10.0,
        };

        let genesis = Block::new(0, vec![], "0".to_string());
        blockchain.chain.push(genesis);
        blockchain
    }

    pub fn add_transaction(&mut self, transaction: Transaction) {
        self.pending_transactions.push(transaction);
    }

    pub fn mine_pending(&mut self, miner_address: &str) {
        let reward_tx = Transaction::new("System", miner_address, self.mining_reward, 0.0);
        self.pending_transactions.push(reward_tx);

        let previous_hash = self.chain.last().map(|b| b.hash.clone()).unwrap();
        let mut block = Block::new(
            self.chain.len() as u64,
            self.pending_transactions.clone(),
            previous_hash,
        );
        block.mine(self.difficulty);

        self.chain.push(block);
        self.pending_transactions.clear();
    }

    pub fn is_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];

            if current.hash != current.calculate_hash() {
                return false;
            }

            if current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }
}

impl Default for Blockchain {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_blockchain() {
        let chain = Blockchain::new();
        assert_eq!(chain.chain.len(), 1);
        assert!(chain.is_valid());
    }

    #[test]
    fn mines_block() {
        let mut chain = Blockchain::new();
        chain.add_transaction(Transaction::new("A", "B", 25.0, 6.0));
        chain.mine_pending("Miner");
        assert_eq!(chain.chain.len(), 2);
        assert!(chain.is_valid());
    }
}
