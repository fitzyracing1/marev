use sha2::{Digest, Sha256};

#[derive(Clone, Debug)]
pub struct Wallet {
    pub owner: String,
    pub address: String,
}

impl Wallet {
    pub fn new(owner: &str) -> Self {
        let address = Self::generate_address(owner);
        Self {
            owner: owner.to_string(),
            address,
        }
    }

    fn generate_address(owner: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(owner.as_bytes());
        format!("0x{}", hex::encode(hasher.finalize())[..40].to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_wallet_with_address() {
        let wallet = Wallet::new("Alice");
        assert!(wallet.address.starts_with("0x"));
        assert_eq!(wallet.owner, "Alice");
    }
}
