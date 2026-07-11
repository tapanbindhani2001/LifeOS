import { PermissionsAndroid, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SmsAndroid from 'react-native-get-sms-android'
import { parseBankSms } from './smsParser'
import { expensesApi } from '../api/features'

// ── Constants ─────────────────────────────────────────────────────────────────

const IMPORTED_IDS_KEY = 'sms_imported_ids_v2'   // Set of Android sms._id strings
const LAST_SYNC_KEY    = 'sms_last_sync_ts'       // Timestamp of last full scan
const SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000       // 6 hours between full scans
const SMS_BATCH_SIZE   = 200                       // Messages per page request
const SMS_MAX_TOTAL    = 2000                      // Hard cap per session
// Only scan SMS from the last 12 months to keep import fast
const SCAN_SINCE_MS    = 12 * 30 * 24 * 60 * 60 * 1000

/**
 * Known Indian bank & payment sender IDs (6-char alphanumeric codes).
 * Only process SMS from these senders — ignores OTPs, promotions, and personal messages.
 * Add new senders here as needed.
 */
const BANK_SENDERS = new Set([
  // Public sector banks
  'SBIINB', 'SBIPSG', 'SBIUPI', 'SBI',
  'BOIIND', 'BOBIND', 'PNBSMS', 'CANBNK', 'CENTBK', 'UNBNKS',
  // Private banks
  'HDFCBK', 'HDFCBN', 'HDFCCC',
  'ICICIB', 'ICICIC', 'ICICIT',
  'AXISBK', 'AXISBN',
  'KOTAKB', 'KTBANK',
  'YESBNK', 'INDBNK', 'IDFCBK', 'RBLBNK', 'FEDBNK',
  'SCBANK', 'CSBBNK', 'DNSBNK', 'SARASB',
  // Small finance / payment banks
  'PAYTMB', 'PAYTMM', 'JUPBNK', 'FIBANK', 'NIYOBK',
  // UPI / wallets
  'GPAY',   'PHONEPE', 'BHIMUPI', 'AMAZONPAY', 'MOBIKW',
  // Credit cards
  'AMEXIN', 'CIBKCC', 'HSBCIN',
])

/**
 * Fast keyword pre-filter: skip SMS that don't contain ANY financial keyword.
 * This is a cheap O(n) check before running the full regex parser.
 */
function isLikelyFinancialSms(body: string): boolean {
  const b = body.toLowerCase()
  return (
    b.includes('rs.') || b.includes('rs ') || b.includes('inr') ||
    b.includes('\u20b9') || // ₹ sign
    b.includes('debited') || b.includes('debit') ||
    b.includes('credited') || b.includes('spent') ||
    b.includes('payment') || b.includes('purchase') ||
    b.includes('transaction') || b.includes('withdraw')
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function loadImportedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(IMPORTED_IDS_KEY)
    if (raw) return new Set<string>(JSON.parse(raw))
  } catch (_) {}
  return new Set<string>()
}

async function saveImportedIds(ids: Set<string>): Promise<void> {
  try {
    // Persist only the most recent 5000 IDs to keep storage bounded
    const arr = Array.from(ids).slice(-5000)
    await AsyncStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify(arr))
  } catch (_) {}
}

function fetchSmsBatch(indexFrom: number, minDate: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('SMS batch query timed out after 10s'))
    }, 10000)

    const filter = {
      box: 'inbox',
      indexFrom,
      maxCount: SMS_BATCH_SIZE,
      minDate,    // Android SMS provider: only fetch SMS >= this epoch ms
    }

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        clearTimeout(timeoutId)
        reject(new Error('SmsAndroid.list failed: ' + fail))
      },
      (_count: number, smsList: string) => {
        clearTimeout(timeoutId)
        try {
          resolve(JSON.parse(smsList) as any[])
        } catch {
          resolve([])
        }
      }
    )
  })
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface SmsImportResult {
  imported: number
  skippedDuplicate: number
  skippedCooldown: boolean
}

/**
 * Production-grade SMS import engine.
 *
 * Features:
 *  - 6-hour cooldown so re-opening the app doesn't re-scan
 *  - Unique dedup via Android sms._id stored in AsyncStorage (not Date:Amount)
 *  - Paginated reads: up to 2000 messages in batches of 200
 *  - Correct transaction date from actual SMS timestamp (sms.date)
 *  - Calls parseBankSms which now handles debit/credit context and full-body category
 */
export async function importTransactionsFromSMS(): Promise<SmsImportResult> {
  if (Platform.OS !== 'android') {
    throw new Error('SMS Auto-Read is only supported on Android.')
  }

  // ── Check cooldown ────────────────────────────────────────────────────────
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY)
    if (lastSync) {
      const elapsed = Date.now() - parseInt(lastSync, 10)
      if (elapsed < SYNC_COOLDOWN_MS) {
        return { imported: 0, skippedDuplicate: 0, skippedCooldown: true }
      }
    }
  } catch (_) {}

  // ── Request permission ────────────────────────────────────────────────────
  const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS)
  if (!hasPermission) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission Required',
        message: 'LifeOS needs SMS access to auto-track bank transactions.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    )
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('SMS permission denied.')
    }
  }

  // ── Load existing imported IDs (dedup set) ────────────────────────────────
  const importedIds = await loadImportedIds()
  const minDate = Date.now() - SCAN_SINCE_MS  // 12 months ago in epoch ms

  let totalImported = 0
  let totalSkipped = 0
  let indexFrom = 0
  let hasMore = true

  // ── Paginated scan loop ───────────────────────────────────────────────────
  while (hasMore && indexFrom < SMS_MAX_TOTAL) {
    let batch: any[] = []
    try {
      batch = await fetchSmsBatch(indexFrom, minDate)
    } catch (err) {
      console.warn('[SMS] Batch fetch failed:', err)
      break
    }

    if (batch.length === 0) {
      hasMore = false
      break
    }

    for (const sms of batch) {
      const smsId: string = String(sms._id ?? sms.id ?? '')
      if (!smsId) continue

      // Dedup: skip already imported messages
      if (importedIds.has(smsId)) {
        totalSkipped++
        continue
      }

      // ── Bank sender filter ───────────────────────────────────────────────
      // Only process SMS from known bank/payment sender IDs.
      // The 'address' field in Android SMS is the sender (e.g. 'HDFCBK', 'VM-SBIINB').
      const sender: string = String(sms.address ?? '').toUpperCase().replace(/^[A-Z]{2}-/, '')
      const isKnownBank = BANK_SENDERS.has(sender) ||
        [...BANK_SENDERS].some(s => sender.includes(s))
      if (!isKnownBank) continue  // Not a bank SMS — skip entirely

      const body: string = sms.body ?? ''
      if (!body) continue

      // ── Keyword pre-filter ───────────────────────────────────────────────
      // Fast check before running the full regex parser
      if (!isLikelyFinancialSms(body)) continue

      const parsed = parseBankSms(body)
      if (!parsed) continue

      // Use the REAL SMS timestamp for transaction date
      const smsEpoch = Number(sms.date)
      const smsDate = isNaN(smsEpoch) ? new Date() : new Date(smsEpoch)
      const dateStr = toDateStr(smsDate)

      try {
        await expensesApi.create({
          description: parsed.merchant,
          amount: parsed.amount,
          category: parsed.category,
          transactionDate: dateStr,
          type: 'EXPENSE',
          smsExternalId: smsId,   // ← backend unique constraint prevents duplicates
        })

        importedIds.add(smsId)
        totalImported++
      } catch (apiErr: any) {
        // If backend returns 409 duplicate, still mark as imported so we skip next time
        if (apiErr?.response?.status === 409) {
          importedIds.add(smsId)
        }
        console.warn('[SMS] Failed to save transaction:', apiErr?.message)
      }
    }

    indexFrom += batch.length

    // If the batch is smaller than the page size, we've reached the end
    if (batch.length < SMS_BATCH_SIZE) {
      hasMore = false
    }
  }

  // ── Persist dedup set and cooldown timestamp ──────────────────────────────
  await saveImportedIds(importedIds)
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()))

  return { imported: totalImported, skippedDuplicate: totalSkipped, skippedCooldown: false }
}

/**
 * Force-reset the sync cooldown so the next app open triggers a fresh scan.
 * Useful after user clears data or for debugging.
 */
export async function resetSmsImportCooldown(): Promise<void> {
  await AsyncStorage.removeItem(LAST_SYNC_KEY)
}

/**
 * Clear the full imported-IDs dedup set.
 * WARNING: will re-import everything on next sync.
 */
export async function clearSmsImportHistory(): Promise<void> {
  await AsyncStorage.multiRemove([IMPORTED_IDS_KEY, LAST_SYNC_KEY])
}
