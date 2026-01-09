export const ORACLE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "asserter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "protocol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "market",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "assertion",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bondUsd",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assertedAt",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "livenessEndsAt",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "txHash",
        "type": "bytes32"
      }
    ],
    "name": "AssertionCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "disputer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "disputedAt",
        "type": "uint256"
      }
    ],
    "name": "AssertionDisputed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "resolvedAt",
        "type": "uint256"
      }
    ],
    "name": "AssertionResolved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "protocol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "market",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "assertionText",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "bondUsd",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "livenessSeconds",
        "type": "uint256"
      }
    ],
    "name": "createAssertion",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "disputeAssertion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "assertionId",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      }
    ],
    "name": "resolveAssertion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
