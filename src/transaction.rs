#[derive(Clone, Debug)]
pub struct Transaction {
    pub from: String,
    pub to: String,
    pub amount: f64,
    pub fee: f64,
}

impl Transaction {
    pub fn new(from: &str, to: &str, amount: f64, fee_percent: f64) -> Self {
        let fee = amount * (fee_percent / 100.0);
        Self {
            from: from.to_string(),
            to: to.to_string(),
            amount,
            fee,
        }
    }

    pub fn total(&self) -> f64 {
        self.amount + self.fee
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_transaction_with_fee() {
        let tx = Transaction::new("Alice", "Bob", 100.0, 6.0);
        assert_eq!(tx.amount, 100.0);
        assert_eq!(tx.fee, 6.0);
        assert_eq!(tx.total(), 106.0);
    }
}
