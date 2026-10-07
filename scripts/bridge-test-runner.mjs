import 'dotenv/config'

import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
import { AppKit } from '@circle-fin/app-kit'
import { createPublicClient, createWalletClient, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const BASE_CHAIN = 'Base'
const ARC_CHAIN = 'Arc'
const BASE_CHAIN_ID = 8453
const ARC_CHAIN_ID = 5042
const USDC_DECIMALS = 6
const USDC_SCALE = 10n ** BigInt(USDC_DECIMALS)
const DEFAULT_ANALYTICS_API_URL = 'https://arc-bridge-backend.onrender.com'

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function parseCount(value, fallback, name) {
  const parsed = Number(value ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`)
  return parsed
}

function parseUsdc(value, name) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) {
    throw new Error(`${name} must be a decimal USDC amount with at most 6 decimal places.`)
  }
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, '0'))
}

function formatUsdc(amountAtomic) {
  const whole = amountAtomic / USDC_SCALE
  const fraction = (amountAtomic % USDC_SCALE).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function randomBigInt(min, max) {
  return min + BigInt(Math.floor(Math.random() * Number(max - min + 1n)))
}

function randomInteger(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function configureProductionFeePolicy(appKit) {
  const recipient = process.env.VITE_ARCBRIDGE_FEE_RECIPIENT?.trim()
  const rawBasisPoints = process.env.VITE_ARCBRIDGE_PRODUCTION_BRIDGE_FEE_BPS?.trim()
  if (!rawBasisPoints || !recipient) return
  if (!/^\d+$/.test(rawBasisPoints) || Number(rawBasisPoints) > 10_000) {
    throw new Error('VITE_ARCBRIDGE_PRODUCTION_BRIDGE_FEE_BPS must be an integer from 0 to 10000.')
  }
  if (!isAddress(recipient)) throw new Error('VITE_ARCBRIDGE_FEE_RECIPIENT must be a valid EVM address.')

  const basisPoints = Number(rawBasisPoints)
  if (basisPoints === 0) return
  appKit.setCustomFeePolicy({
    bridge: {
      computeFee: ({ amount }) => {
        if (!/^\d+(?:\.\d{1,6})?$/.test(amount)) return '0'
        const [whole, fraction = ''] = amount.split('.')
        const atomic = BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, '0'))
        const feeAtomic = atomic * BigInt(basisPoints) / 10_000n
        return formatUsdc(feeAtomic)
      },
      resolveFeeRecipientAddress: () => recipient,
    },
  })
}

async function recordAnalyticsOnce({ burnHash, analyticsApiUrl, sourceChainId, destinationChainId, attemptedHashes }) {
  const normalizedHash = burnHash.toLowerCase()
  if (attemptedHashes.has(normalizedHash)) {
    console.log('Analytics: skipped (already submitted for this burn transaction)')
    return
  }

  // Mark before the request so an ambiguous network failure cannot trigger a duplicate POST.
  attemptedHashes.add(normalizedHash)
  try {
    const response = await fetch(`${analyticsApiUrl}/api/bridges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: 'mainnet',
        sourceChainId,
        destinationChainId,
        txHash: burnHash,
      }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`
      throw new Error(message)
    }
    console.log('Analytics: recorded')
  } catch (error) {
    console.error(`Analytics: failed — ${error instanceof Error ? error.message : String(error)}`)
  }
}

function readSettings() {
  const privateKey = requiredEnv('PRIVATE_KEY')
  const baseRpcUrl = requiredEnv('BASE_RPC_URL')
  const arcRpcUrl = requiredEnv('ARC_RPC_URL')
  const runCount = parseCount(process.env.TEST_RUN_COUNT, '10', 'TEST_RUN_COUNT')
  const minAmount = parseUsdc(process.env.TEST_MIN_AMOUNT ?? '0.001', 'TEST_MIN_AMOUNT')
  const maxAmount = parseUsdc(process.env.TEST_MAX_AMOUNT ?? '0.01', 'TEST_MAX_AMOUNT')
  const minDelay = parseCount(process.env.TEST_MIN_DELAY, '10', 'TEST_MIN_DELAY')
  const maxDelay = parseCount(process.env.TEST_MAX_DELAY, '25', 'TEST_MAX_DELAY')
  const sourceChain = process.env.TEST_SOURCE_CHAIN?.trim() || BASE_CHAIN
  const destinationChain = process.env.TEST_DESTINATION_CHAIN?.trim() || ARC_CHAIN
  const analyticsApiUrl = (process.env.ANALYTICS_API_URL?.trim() || DEFAULT_ANALYTICS_API_URL).replace(/\/$/, '')

  if (sourceChain !== BASE_CHAIN || destinationChain !== ARC_CHAIN) {
    throw new Error('This runner only supports TEST_SOURCE_CHAIN=Base and TEST_DESTINATION_CHAIN=Arc.')
  }
  if (minAmount <= 0n || maxAmount < minAmount) throw new Error('TEST_MIN_AMOUNT and TEST_MAX_AMOUNT must be positive and min <= max.')
  if (maxDelay < minDelay) throw new Error('TEST_MAX_DELAY must be greater than or equal to TEST_MIN_DELAY.')
  try {
    new URL(baseRpcUrl)
    new URL(arcRpcUrl)
    new URL(analyticsApiUrl)
  } catch {
    throw new Error('BASE_RPC_URL, ARC_RPC_URL, and ANALYTICS_API_URL must be valid URLs.')
  }

  return { privateKey, baseRpcUrl, arcRpcUrl, runCount, minAmount, maxAmount, minDelay, maxDelay, sourceChain, destinationChain, analyticsApiUrl }
}

async function main() {
  const settings = readSettings()
  const appKit = new AppKit()
  configureProductionFeePolicy(appKit)
  const supportedChains = appKit.getSupportedChains('bridge')
  const source = supportedChains.find((chain) => chain.chain === settings.sourceChain && chain.chainId === BASE_CHAIN_ID && chain.type === 'evm' && !chain.isTestnet && chain.usdcAddress)
  const arc = supportedChains.find((chain) => chain.chain === settings.destinationChain && chain.chainId === ARC_CHAIN_ID && chain.type === 'evm' && !chain.isTestnet && chain.usdcAddress)

  if (!source) throw new Error('The installed Circle App Kit registry does not expose Base mainnet with USDC support.')
  if (!arc) throw new Error('The installed Circle App Kit registry does not expose the expected Arc mainnet bridge destination.')

  const account = privateKeyToAccount((settings.privateKey.startsWith('0x') ? settings.privateKey : `0x${settings.privateKey}`))
  const rpcUrlForChain = (chain) => {
    if (chain.id === BASE_CHAIN_ID) return settings.baseRpcUrl
    if (chain.id === ARC_CHAIN_ID) return settings.arcRpcUrl
    throw new Error(`No RPC URL is configured for chain ID ${chain.id}.`)
  }
  const adapter = createViemAdapterFromPrivateKey({
    privateKey: settings.privateKey,
    getPublicClient: ({ chain }) => createPublicClient({
      chain,
      transport: http(rpcUrlForChain(chain)),
    }),
    getWalletClient: ({ chain, account }) => createWalletClient({
      chain,
      account,
      transport: http(rpcUrlForChain(chain)),
    }),
  })

  console.log(`Route: ${source.name} → ${arc.name}`)
  console.log(`Test count: ${settings.runCount}`)
  console.log(`USDC amount range: ${formatUsdc(settings.minAmount)}–${formatUsdc(settings.maxAmount)}`)
  console.log('This will submit real transactions on Arc mainnet.')

  const readline = createInterface({ input: stdin, output: stdout })
  let confirmation
  try {
    confirmation = await readline.question('Type RUN_MAINNET_TEST to continue: ')
  } finally {
    readline.close()
  }
  if (confirmation !== 'RUN_MAINNET_TEST') {
    console.log('Confirmation did not match. No transactions were sent.')
    return
  }

  let successful = 0
  let failed = 0
  let totalBridged = 0n
  const analyticsAttemptedHashes = new Set()

  for (let index = 1; index <= settings.runCount; index += 1) {
    const amount = formatUsdc(randomBigInt(settings.minAmount, settings.maxAmount))
    console.log(`\n[${index}/${settings.runCount}] Starting`)
    console.log(`Amount: ${amount} USDC`)
    console.log(`Route: ${source.name} → ${arc.name}`)
    console.log('Status: bridging')

    try {
      const result = await appKit.bridge({
        from: { adapter, chain: source.chain },
        to: { chain: arc.chain, recipientAddress: account.address, useForwarder: true },
        amount,
        token: 'USDC',
      })

      if (result.state !== 'success') {
        const failedStep = result.steps.find((step) => step.state === 'error')
        const errorMessage = failedStep?.errorMessage
          || (failedStep?.error instanceof Error ? failedStep.error.message : undefined)
          || 'Circle bridge operation did not complete successfully.'
        const stepLabel = failedStep?.name ? ` at the ${failedStep.name} step` : ''
        throw new Error(`${errorMessage}${stepLabel}`)
      }

      const burnHash = result.steps.find((step) => step.name.toLowerCase() === 'burn')?.txHash
      const mintHash = result.steps.find((step) => step.name.toLowerCase() === 'mint')?.txHash

      if (burnHash) console.log(`Burn TX: ${burnHash}`)
      if (mintHash) console.log(`Mint TX: ${mintHash}`)
      else console.log('Mint TX: unavailable (Circle result did not include a mint transaction hash)')

      successful += 1
      totalBridged += parseUsdc(amount, 'amount')
      console.log('Status: confirmed')
      if (burnHash) {
        await recordAnalyticsOnce({
          burnHash,
          analyticsApiUrl: settings.analyticsApiUrl,
          sourceChainId: source.chainId,
          destinationChainId: arc.chainId,
          attemptedHashes: analyticsAttemptedHashes,
        })
      } else {
        console.log('Analytics: skipped (Circle result did not include a burn transaction hash)')
      }
    } catch (error) {
      failed += 1
      console.error(`Status: failed — ${error instanceof Error ? error.message : String(error)}`)
    }

    if (index < settings.runCount) {
      const delay = randomInteger(settings.minDelay, settings.maxDelay)
      console.log(`Waiting ${delay} seconds before the next iteration.`)
      await new Promise((resolve) => setTimeout(resolve, delay * 1000))
    }
  }

  const total = successful + failed
  const successRate = total === 0 ? 0 : (successful / total) * 100
  console.log('\nSummary')
  console.log(`Total: ${total}`)
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total USDC bridged: ${formatUsdc(totalBridged)} USDC`)
  console.log(`Success rate: ${successRate.toFixed(2)}%`)
}

main().catch((error) => {
  console.error(`Runner stopped: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
