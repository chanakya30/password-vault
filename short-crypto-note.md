Crypto Implementation
We use libsodium with Argon2id for key derivation and XChaCha20-Poly1305 for encryption. This provides military-grade security with protection against brute-force attacks while ensuring authenticated encryption where data cannot be tampered with undetected.

Client-side encryption means your master password never leaves your device - we only store encrypted blobs that are useless without your key, ensuring complete privacy and zero-knowledge architecture.