export const UMA_OPTIMISTIC_ORACLE_V2_ABI = [
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
      { name: 'currency', type: 'address' },
      { name: 'reward', type: 'uint256' },
      { name: 'finalFee', type: 'uint256' },
      { name: 'bond', type: 'uint256' },
      { name: 'customLiveness', type: 'uint256' },
      { name: 'proposer', type: 'address' },
      { name: 'callbackContract', type: 'address' },
      { name: 'escalateManually', type: 'bool' },
      { name: 'extraData', type: 'bytes' },
    ],
    name: 'proposePrice',
    outputs: [{ name: 'totalBond', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'disputePrice',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'settle',
    outputs: [
      { name: 'price', type: 'int256' },
      { name: 'settledAt', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'getRequest',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'requestState', type: 'uint8' },
          { name: 'currency', type: 'address' },
          { name: 'reward', type: 'uint256' },
          { name: 'finalFee', type: 'uint256' },
          { name: 'proposer', type: 'address' },
          { name: 'disputer', type: 'address' },
          { name: 'proposedPrice', type: 'int256' },
          { name: 'settledPrice', type: 'int256' },
          { name: 'proposalExpirationTimestamp', type: 'uint256' },
          { name: 'disputeTimestamp', type: 'uint256' },
          { name: 'settlementTimestamp', type: 'uint256' },
          { name: 'bond', type: 'uint256' },
          { name: 'customLiveness', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'hasPrice',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'identifierWhitelist',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UMA_OPTIMISTIC_ORACLE_V3_ABI = [
  {
    inputs: [
      { name: 'claim', type: 'string' },
      { name: 'currency', type: 'address' },
      { name: 'bond', type: 'uint256' },
      { name: 'identifier', type: 'bytes32' },
      { name: 'escalateManually', type: 'bool' },
      { name: 'extraData', type: 'bytes' },
    ],
    name: 'assertTruth',
    outputs: [{ name: 'assertionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'settleAssertion',
    outputs: [
      { name: 'resolved', type: 'bool' },
      { name: 'settledValue', type: 'bool' },
      { name: 'anchorValue', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertion',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'asserter', type: 'address' },
          { name: 'callbackContract', type: 'address' },
          { name: 'escalateManually', type: 'bool' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'currency', type: 'address' },
          { name: 'disputeSolver', type: 'address' },
          { name: 'noDataPresent', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertionResult',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'assertionDisputed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'claim', type: 'string' },
      { indexed: true, name: 'asserter', type: 'address' },
    ],
    name: 'AssertionMade',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'settledValue', type: 'bool' },
    ],
    name: 'AssertionSettled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: true, name: 'disputer', type: 'address' },
    ],
    name: 'AssertionDisputed',
    type: 'event',
  },
] as const;

export const UMA_FINDER_ABI = [
  {
    inputs: [{ name: 'interfaceName', type: 'bytes32' }],
    name: 'getImplementationAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'interfaceName', type: 'bytes32' },
      { name: 'implementationAddress', type: 'address' },
    ],
    name: 'changeImplementationAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'interfacesImplemented',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UMA_WHITELIST_ABI = [
  {
    inputs: [{ name: 'newElement', type: 'address' }],
    name: 'addToWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'elementToRemove', type: 'address' }],
    name: 'removeFromWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'element', type: 'address' }],
    name: 'isOnWhitelist',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
