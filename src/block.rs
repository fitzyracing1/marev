use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::transaction::Transaction;

#[derive(Clone, Debug)]
pub struct Block {
    pub index: u64,
    pub timestamp: u64,
    pub transactions: Vec<Transaction>,
    pub previous_hash: String,
    pub hash: String,
    pub nonce: u64,
}

impl Block {
    pub fn new(index: u64, transactions: Vec<Transaction>, previous_hash: String) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut block = Self {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash: String::new(),
            nonce: 0,
        };

        block.hash = block.calculate_hash();
        block
    }

    pub fn calculate_hash(&self) -> String {
        let tx_string = self
            .transactions
            .iter()
            .map(|tx| format!("{}->{}:{}:{}", tx.from, tx.to, tx.amount, tx.fee))
            .collect::<Vec<_>>()
            .join("|");

        let input = format!(
            "{}{}{}{}{}",
            self.index, self.timestamp, tx_string, self.previous_hash, self.nonce
        );

        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn mine(&mut self, difficulty: usize) {
        let target = "0".repeat(difficulty);
        while !self.hash.starts_with(&target) {
            self.nonce += 1;
            self.hash = self.calculate_hash();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_block_with_hash() {
        let block = Block::new(0, vec![], "0".to_string());
        assert_eq!(block.index, 0);
        assert!(!block.hash.is_empty());
    }

    #[test]
    fn mining_changes_hash() {
        let mut block = Block::new(1, vec![], "abc".to_string());
        let initial = block.hash.clone();
        block.mine(2);
        assert_ne!(initial, block.hash);
    }
}
