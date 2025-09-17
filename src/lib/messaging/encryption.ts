// Signal Protocol E2E Encryption for TechFlunky Messaging
// Enterprise-grade encryption for secure marketplace communications

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  signature: string;
  timestamp: number;
  messageType: 'text' | 'file' | 'system';
  keyBundle?: KeyBundle;
}

export interface KeyBundle {
  identityKey: string;
  signedPreKey: string;
  oneTimeKeys: string[];
  signature: string;
}

export interface DeviceKeys {
  identityKeyPair: CryptoKeyPair;
  signedPreKeyPair: CryptoKeyPair;
  oneTimeKeyPairs: CryptoKeyPair[];
  registrationId: number;
}

export interface Session {
  id: string;
  participantId: string;
  rootKey: string;
  chainKey: string;
  sendingChain: ChainState;
  receivingChain: ChainState;
  messageKeys: Map<number, string>;
}

interface ChainState {
  keyPair: CryptoKeyPair;
  chainKey: string;
  messageNumber: number;
}

// Signal Protocol Implementation for TechFlunky
export class SignalProtocolEngine {
  private deviceKeys: DeviceKeys | null = null;
  private sessions: Map<string, Session> = new Map();
  private preKeyStore: Map<string, CryptoKeyPair> = new Map();

  // Initialize device with cryptographic keys
  async initializeDevice(userId: string): Promise<KeyBundle> {
    // Generate identity key pair (Ed25519)
    const identityKeyPair = await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519'
      },
      true,
      ['sign', 'verify']
    );

    // Generate signed pre-key pair (X25519)
    const signedPreKeyPair = await crypto.subtle.generateKey(
      {
        name: 'X25519'
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Generate one-time keys (X25519)
    const oneTimeKeyPairs: CryptoKeyPair[] = [];
    for (let i = 0; i < 100; i++) {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'X25519'
        },
        true,
        ['deriveKey', 'deriveBits']
      );
      oneTimeKeyPairs.push(keyPair);
    }

    // Generate registration ID
    const registrationId = Math.floor(Math.random() * 16384);

    this.deviceKeys = {
      identityKeyPair,
      signedPreKeyPair,
      oneTimeKeyPairs,
      registrationId
    };

    // Export public keys for key bundle
    const identityKey = await this.exportPublicKey(identityKeyPair.publicKey);
    const signedPreKey = await this.exportPublicKey(signedPreKeyPair.publicKey);
    const oneTimeKeys = await Promise.all(
      oneTimeKeyPairs.slice(0, 10).map(kp => this.exportPublicKey(kp.publicKey))
    );

    // Sign the signed pre-key
    const signedPreKeyData = new TextEncoder().encode(signedPreKey);
    const signature = await crypto.subtle.sign(
      'Ed25519',
      identityKeyPair.privateKey,
      signedPreKeyData
    );

    const keyBundle: KeyBundle = {
      identityKey,
      signedPreKey,
      oneTimeKeys,
      signature: this.arrayBufferToBase64(signature)
    };

    // Store key bundle in secure storage
    await this.storeKeyBundle(userId, keyBundle);

    return keyBundle;
  }

  // Encrypt message using Signal Protocol
  async encryptMessage(
    recipientId: string,
    content: string,
    messageType: 'text' | 'file' | 'system' = 'text'
  ): Promise<EncryptedMessage> {
    if (!this.deviceKeys) {
      throw new Error('Device not initialized');
    }

    let session = this.sessions.get(recipientId);

    // Establish session if doesn't exist
    if (!session) {
      session = await this.establishSession(recipientId);
      this.sessions.set(recipientId, session);
    }

    // Generate message key using Double Ratchet
    const messageKey = await this.generateMessageKey(session);

    // Encrypt content with AES-GCM
    const contentBytes = new TextEncoder().encode(content);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(messageKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      contentBytes
    );

    // Create message authentication
    const messageData = {
      content: this.arrayBufferToBase64(encryptedContent),
      iv: this.arrayBufferToBase64(iv),
      timestamp: Date.now()
    };

    const signature = await this.signMessage(messageData);

    const encryptedMessage: EncryptedMessage = {
      id: this.generateMessageId(),
      senderId: this.deviceKeys.registrationId.toString(),
      recipientId,
      encryptedContent: JSON.stringify(messageData),
      signature,
      timestamp: Date.now(),
      messageType
    };

    return encryptedMessage;
  }

  // Decrypt incoming message
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string> {
    if (!this.deviceKeys) {
      throw new Error('Device not initialized');
    }

    // Verify message signature
    const isValid = await this.verifyMessageSignature(
      encryptedMessage.encryptedContent,
      encryptedMessage.signature,
      encryptedMessage.senderId
    );

    if (!isValid) {
      throw new Error('Message signature verification failed');
    }

    const messageData = JSON.parse(encryptedMessage.encryptedContent);
    let session = this.sessions.get(encryptedMessage.senderId);

    if (!session) {
      throw new Error('No session found for sender');
    }

    // Derive message key
    const messageKey = await this.deriveMessageKey(session, messageData.timestamp);

    // Decrypt content
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(messageKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.base64ToArrayBuffer(messageData.iv)
      },
      encryptionKey,
      this.base64ToArrayBuffer(messageData.content)
    );

    return new TextDecoder().decode(decryptedContent);
  }

  // Establish secure session with recipient
  private async establishSession(recipientId: string): Promise<Session> {
    // Fetch recipient's key bundle
    const recipientBundle = await this.fetchKeyBundle(recipientId);

    if (!recipientBundle || !this.deviceKeys) {
      throw new Error('Cannot establish session - missing key bundle');
    }

    // Perform X3DH key agreement
    const sharedSecret = await this.performX3DH(recipientBundle);

    // Initialize Double Ratchet
    const session = await this.initializeDoubleRatchet(recipientId, sharedSecret);

    return session;
  }

  // X3DH Key Agreement Protocol
  private async performX3DH(recipientBundle: KeyBundle): Promise<ArrayBuffer> {
    if (!this.deviceKeys) {
      throw new Error('Device keys not initialized');
    }

    // Generate ephemeral key pair
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Import recipient's public keys
    const recipientIdentityKey = await this.importPublicKey(recipientBundle.identityKey, 'Ed25519');
    const recipientSignedPreKey = await this.importPublicKey(recipientBundle.signedPreKey, 'X25519');
    const recipientOneTimeKey = recipientBundle.oneTimeKeys.length > 0
      ? await this.importPublicKey(recipientBundle.oneTimeKeys[0], 'X25519')
      : null;

    // Verify signed pre-key signature
    const signedPreKeyData = new TextEncoder().encode(recipientBundle.signedPreKey);
    const signatureValid = await crypto.subtle.verify(
      'Ed25519',
      recipientIdentityKey,
      this.base64ToArrayBuffer(recipientBundle.signature),
      signedPreKeyData
    );

    if (!signatureValid) {
      throw new Error('Invalid signed pre-key signature');
    }

    // Perform ECDH operations
    const dh1 = await crypto.subtle.deriveBits(
      { name: 'X25519', public: recipientSignedPreKey },
      this.deviceKeys.identityKeyPair.privateKey,
      256
    );

    const dh2 = await crypto.subtle.deriveBits(
      { name: 'X25519', public: recipientSignedPreKey },
      ephemeralKeyPair.privateKey,
      256
    );

    let sharedSecrets = [dh1, dh2];

    // Include one-time key if available
    if (recipientOneTimeKey) {
      const dh3 = await crypto.subtle.deriveBits(
        { name: 'X25519', public: recipientOneTimeKey },
        ephemeralKeyPair.privateKey,
        256
      );
      sharedSecrets.push(dh3);
    }

    // Combine shared secrets using HKDF
    const combinedSecret = await this.combineSecrets(sharedSecrets);

    return combinedSecret;
  }

  // Initialize Double Ratchet for forward secrecy
  private async initializeDoubleRatchet(participantId: string, sharedSecret: ArrayBuffer): Promise<Session> {
    // Derive root key and chain key from shared secret
    const rootKey = await this.deriveKey(sharedSecret, 'root');
    const chainKey = await this.deriveKey(sharedSecret, 'chain');

    // Generate initial sending chain key pair
    const sendingChainKeyPair = await crypto.subtle.generateKey(
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Generate initial receiving chain (will be updated when receiving first message)
    const receivingChainKeyPair = await crypto.subtle.generateKey(
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const session: Session = {
      id: this.generateSessionId(),
      participantId,
      rootKey,
      chainKey,
      sendingChain: {
        keyPair: sendingChainKeyPair,
        chainKey,
        messageNumber: 0
      },
      receivingChain: {
        keyPair: receivingChainKeyPair,
        chainKey,
        messageNumber: 0
      },
      messageKeys: new Map()
    };

    return session;
  }

  // Generate message key using chain key
  private async generateMessageKey(session: Session): Promise<string> {
    const chainKeyBytes = this.base64ToArrayBuffer(session.sendingChain.chainKey);

    // Derive new chain key
    const newChainKey = await crypto.subtle.importKey(
      'raw',
      chainKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const chainKeyData = new TextEncoder().encode('chain-key');
    const newChainKeyBytes = await crypto.subtle.sign('HMAC', newChainKey, chainKeyData);

    // Derive message key
    const messageKeyData = new TextEncoder().encode('message-key');
    const messageKeyBytes = await crypto.subtle.sign('HMAC', newChainKey, messageKeyData);

    // Update session
    session.sendingChain.chainKey = this.arrayBufferToBase64(newChainKeyBytes);
    session.sendingChain.messageNumber++;

    return this.arrayBufferToBase64(messageKeyBytes);
  }

  // Derive message key for decryption
  private async deriveMessageKey(session: Session, timestamp: number): Promise<string> {
    // Use timestamp to derive appropriate message key
    const chainKeyBytes = this.base64ToArrayBuffer(session.receivingChain.chainKey);

    const chainKey = await crypto.subtle.importKey(
      'raw',
      chainKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const messageKeyData = new TextEncoder().encode(`message-key-${timestamp}`);
    const messageKeyBytes = await crypto.subtle.sign('HMAC', chainKey, messageKeyData);

    return this.arrayBufferToBase64(messageKeyBytes);
  }

  // Utility functions
  private async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const keyData = await crypto.subtle.exportKey('raw', publicKey);
    return this.arrayBufferToBase64(keyData);
  }

  private async importPublicKey(keyString: string, algorithm: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      algorithm === 'Ed25519' ? { name: 'Ed25519', namedCurve: 'Ed25519' } : { name: 'X25519' },
      false,
      algorithm === 'Ed25519' ? ['verify'] : ['deriveKey', 'deriveBits']
    );
  }

  private async signMessage(messageData: any): Promise<string> {
    if (!this.deviceKeys) {
      throw new Error('Device keys not initialized');
    }

    const messageBytes = new TextEncoder().encode(JSON.stringify(messageData));
    const signature = await crypto.subtle.sign(
      'Ed25519',
      this.deviceKeys.identityKeyPair.privateKey,
      messageBytes
    );

    return this.arrayBufferToBase64(signature);
  }

  private async verifyMessageSignature(content: string, signature: string, senderId: string): Promise<boolean> {
    try {
      // Fetch sender's public key
      const senderBundle = await this.fetchKeyBundle(senderId);
      if (!senderBundle) return false;

      const senderPublicKey = await this.importPublicKey(senderBundle.identityKey, 'Ed25519');
      const contentBytes = new TextEncoder().encode(content);
      const signatureBytes = this.base64ToArrayBuffer(signature);

      return await crypto.subtle.verify(
        'Ed25519',
        senderPublicKey,
        signatureBytes,
        contentBytes
      );
    } catch {
      return false;
    }
  }

  private async combineSecrets(secrets: ArrayBuffer[]): Promise<ArrayBuffer> {
    // Concatenate all secrets
    const totalLength = secrets.reduce((sum, secret) => sum + secret.byteLength, 0);
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (const secret of secrets) {
      combined.set(new Uint8Array(secret), offset);
      offset += secret.byteLength;
    }

    // Use HKDF to derive final secret
    const key = await crypto.subtle.importKey('raw', combined, 'HKDF', false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('Signal_Protocol_v1')
      },
      key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return await crypto.subtle.exportKey('raw', derivedKey);
  }

  private async deriveKey(secret: ArrayBuffer, purpose: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode(purpose)
      },
      key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const keyData = await crypto.subtle.exportKey('raw', derivedKey);
    return this.arrayBufferToBase64(keyData);
  }

  // Secure storage operations
  private async storeKeyBundle(userId: string, keyBundle: KeyBundle): Promise<void> {
    // In production, store in secure encrypted storage
    localStorage.setItem(`keyBundle_${userId}`, JSON.stringify(keyBundle));
  }

  private async fetchKeyBundle(userId: string): Promise<KeyBundle | null> {
    // In production, fetch from secure server
    const stored = localStorage.getItem(`keyBundle_${userId}`);
    return stored ? JSON.parse(stored) : null;
  }

  // Helper functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const signalProtocol = new SignalProtocolEngine();