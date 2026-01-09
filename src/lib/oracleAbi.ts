export const oracleAbi = [
  {
    type: 'function',
    name: 'assertTruth',
    inputs: [
      { name: 'protocol', type: 'string' },
      { name: 'market', type: 'string' },
      { name: 'assertion', type: 'string' }
    ],
    outputs: [{ name: 'assertionId', type: 'bytes32' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'disputeAssertion',
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'vote',
    inputs: [
      { name: 'assertionId', type: 'bytes32' },
      { name: 'support', type: 'bool' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'settleAssertion',
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getBond',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;
