import type { NimiqProvider } from './nimiq'

const LUNA_PER_NIM = 100_000

interface AccountByAddressResult {
  address: string
  balance: number
  type: string
  sender?: string
}

type BalanceRpcProvider = Pick<NimiqProvider, 'getRPC'>

interface AddressTransaction {
  relatedAddresses?: string[]
}

function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').toUpperCase()
}

export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM
}

/** Reads NIM balance through Nimiq Pay's RPC (matches mainnet/testnet with the wallet). */
export async function fetchBalanceFromProvider(
  provider: BalanceRpcProvider,
  address: string,
): Promise<{ address: string; balance_nim: number; total_nim: number; locked_nim: number }> {
  const rpc = provider.getRPC()
  if (!rpc) throw new Error('Wallet RPC unavailable')

  const account = await rpc.call<AccountByAddressResult>({
    jsonrpc: '2.0',
    method: 'getAccountByAddress',
    params: [address],
  })

  if (!account || typeof account.balance !== 'number') {
    throw new Error('Wallet returned an invalid balance response')
  }

  const transactions = await rpc.call<AddressTransaction[]>({
    jsonrpc: '2.0',
    method: 'getTransactionsByAddress',
    params: [address, 100, null],
  })
  const related = new Set(
    (transactions ?? []).flatMap((transaction) => transaction.relatedAddresses ?? []),
  )
  related.delete(address)

  let lockedLuna = 0
  const owner = normalizeAddress(address)
  for (const relatedAddress of related) {
    const relatedAccount = await rpc.call<AccountByAddressResult>({
      jsonrpc: '2.0',
      method: 'getAccountByAddress',
      params: [relatedAddress],
    })
    if (
      relatedAccount?.type === 'htlc'
      && typeof relatedAccount.balance === 'number'
      && relatedAccount.sender
      && normalizeAddress(relatedAccount.sender) === owner
    ) {
      lockedLuna += relatedAccount.balance
    }
  }

  return {
    address: account.address ?? address,
    balance_nim: lunaToNim(account.balance),
    total_nim: lunaToNim(account.balance + lockedLuna),
    locked_nim: lunaToNim(lockedLuna),
  }
}
