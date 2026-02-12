/**
 * UMA Optimistic Oracle V3 ABI
 *
 * 统一的 UMA V3 ABI 定义，供 umaOracle.ts 和 umaTransaction.ts 使用
 */

export const UMA_OPTIMISTIC_ORACLE_V3_ABI = [
  // ============ 读取函数 ============
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertion',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'identifier', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'requester', type: 'address' },
          { name: 'resolved', type: 'bool' },
          { name: 'disputed', type: 'bool' },
          { name: 'settlementResolution', type: 'uint256' },
          { name: 'currency', type: 'address' },
          { name: 'bond', type: 'uint256' },
          { name: 'expirationTime', type: 'uint256' },
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
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getDispute',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'disputer', type: 'address' },
          { name: 'disputeTimestamp', type: 'uint256' },
          { name: 'disputeBond', type: 'uint256' },
          { name: 'disputeStatus', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'currency', type: 'address' }],
    name: 'getMinimumBond',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'currency', type: 'address' }],
    name: 'finalFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'defaultLiveness',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ============ 写入函数 ============
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
    inputs: [
      { name: 'assertionId', type: 'bytes32' },
      { name: 'disputer', type: 'address' },
    ],
    name: 'disputeAssertion',
    outputs: [],
    stateMutability: 'payable',
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
  // ============ 事件 ============
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: true, name: 'domainId', type: 'bytes32' },
      { indexed: false, name: 'claim', type: 'bytes' },
      { indexed: true, name: 'asserter', type: 'address' },
      { indexed: false, name: 'callbackRecipient', type: 'address' },
      { indexed: false, name: 'escalationManager', type: 'address' },
      { indexed: false, name: 'caller', type: 'address' },
      { indexed: false, name: 'expirationTime', type: 'uint64' },
      { indexed: false, name: 'currency', type: 'address' },
      { indexed: false, name: 'bond', type: 'uint256' },
      { indexed: false, name: 'identifier', type: 'bytes32' },
    ],
    name: 'AssertionMade',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: true, name: 'caller', type: 'address' },
      { indexed: true, name: 'disputer', type: 'address' },
    ],
    name: 'AssertionDisputed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'settledValue', type: 'bool' },
      { indexed: false, name: 'disputed', type: 'bool' },
      { indexed: true, name: 'bondRecipient', type: 'address' },
    ],
    name: 'AssertionSettled',
    type: 'event',
  },
] as const;
