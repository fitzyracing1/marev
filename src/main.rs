use marev1::{Blockchain, Transaction, Wallet};

fn main() {
    println!("Marev1 - Minimal Blockchain Demo");

    let mut chain = Blockchain::new();
    let alice = Wallet::new("Alice");
    let bob = Wallet::new("Bob");

    println!("Alice: {}", alice.address);
    println!("Bob:   {}", bob.address);

    let tx = Transaction::new(&alice.address, &bob.address, 100.0, 6.0);
    chain.add_transaction(tx);
    chain.mine_pending("Miner-01");

    println!("Blocks: {}", chain.chain.len());
    println!("Chain valid: {}", chain.is_valid());
}
