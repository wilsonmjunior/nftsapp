import Big from 'big.js'

import type { EthAmount } from '@/api/contracts'

Big.DP = 18
Big.RM = Big.roundHalfUp

export function eth(value: EthAmount | number | Big) {
  return new Big(value)
}

export function sumEth(values: Array<EthAmount | Big>) {
  return values.reduce<Big>((total, value) => total.plus(value), new Big(0))
}

/** Normaliza para string decimal sem zeros à direita (formato do contrato). */
export function toEthString(value: Big) {
  return value.round(18).toFixed().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** Formata para exibição: "1.19 ETH", com ao menos 2 casas como no layout. */
export function formatEth(value: EthAmount | Big, { minDecimals = 2, maxDecimals = 6 } = {}) {
  const big = typeof value === 'string' ? new Big(value) : value
  const [, decimals = ''] = big.toFixed().split('.')
  const digits = Math.min(Math.max(decimals.replace(/0+$/, '').length, minDecimals), maxDecimals)
  return `${big.toFixed(digits)} ETH`
}
