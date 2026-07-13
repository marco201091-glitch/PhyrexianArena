import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';

async function digestSha256(data: ArrayBuffer | ArrayBufferView) {
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, bytes);
}

const subtlePolyfill = {
  async digest(algorithm: AlgorithmIdentifier, data: ArrayBuffer | ArrayBufferView) {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name !== 'SHA-256') {
      throw new Error(`Unsupported algorithm: ${name}`);
    }
    return digestSha256(data);
  },
};

const cryptoRef = globalThis.crypto as Crypto | undefined;

if (!cryptoRef?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: ExpoCrypto.getRandomValues,
      subtle: subtlePolyfill,
    } as Crypto,
    configurable: true,
  });
} else if (!cryptoRef.subtle) {
  Object.defineProperty(cryptoRef, 'subtle', {
    value: subtlePolyfill,
    configurable: true,
  });
}