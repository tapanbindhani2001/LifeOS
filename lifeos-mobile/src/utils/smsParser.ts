export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: string;
  // NOTE: transactionDate is intentionally NOT returned here.
  // The caller (smsAutoReader) uses sms.date (real Android timestamp) for dates.
}

/**
 * Parses transactional SMS from Indian banks and extracts expense details.
 *
 * Production-hardened:
 *  - Debit/credit context-aware (debit wins if both appear)
 *  - Handles Rs / INR / ₹ amount formats
 *  - Merchant extracted from multiple UPI/bank formats
 *  - Category inferred from full SMS body (not just merchant name)
 */
export function parseBankSms(text: string): ParsedExpense | null {
  if (!text || text.trim().length < 10) return null;

  const lower = text.toLowerCase();

  // ── 1. Debit / Credit detection ──────────────────────────────────────────
  // Find positions of first debit and credit keyword occurrence.
  // If debit appears before credit (or credit doesn't appear at all), treat as debit.
  const debitKeywords = ['debited', 'debit', 'spent', 'paid', 'transacted', 'charged', 'purchase', 'payment of'];
  const creditKeywords = ['credited', 'credit', 'received', 'refunded', 'cashback', 'added to your', 'money added'];

  const firstDebitIdx = Math.min(
    ...debitKeywords.map(k => { const i = lower.indexOf(k); return i === -1 ? Infinity : i; })
  );
  const firstCreditIdx = Math.min(
    ...creditKeywords.map(k => { const i = lower.indexOf(k); return i === -1 ? Infinity : i; })
  );

  // Pure credit message — skip entirely
  if (firstCreditIdx < firstDebitIdx && firstDebitIdx === Infinity) return null;
  // Neither debit nor credit word found — check if there's an amount at all
  if (firstDebitIdx === Infinity && firstCreditIdx === Infinity) {
    const hasAmount = /(?:Rs\.?|INR|₹)\s*[\d,]+/i.test(text);
    if (!hasAmount) return null;
  }

  // ── 2. Amount extraction ──────────────────────────────────────────────────
  // Handles: Rs.450, Rs 450, INR 1,200.00, ₹ 3500, Rs. 1,23,456.78
  const amountRegexes = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount|amt)[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  let amount = 0;
  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match?.[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) { amount = parsed; break; }
    }
  }
  if (amount <= 0) return null;

  // ── 3. Merchant name extraction ───────────────────────────────────────────
  // Priority order: named merchant → UPI VPA → "to <name>" → generic
  const merchantPatterns = [
    // "at Swiggy on", "at McDonald's using"
    /\bat\s+([A-Za-z0-9][A-Za-z0-9\s\-_'.@]+?)(?:\s+on\s|\s+using\s|\s+via\s|\s+ref|\s+bal|\s+avl|[.,]|$)/i,
    // "to Zomato on", "to Ravi Kumar"
    /\bto\s+([A-Za-z][A-Za-z0-9\s\-_'.]+?)(?:\s+on\s|\s+ref|\s+bal|\s+avl|[.,]|$)/i,
    // UPI/Info block: "Info: SWIGGY", "UPI: paytm@upi"
    /\b(?:info|upi|vpa)[:\s]+([A-Za-z0-9][A-Za-z0-9\s@._\-]+?)(?:\s+on\s|\s+ref|[.,]|$)/i,
    // "paid to <name>"
    /paid\s+to\s+([A-Za-z][A-Za-z0-9\s\-_.]+?)(?:\s+on\s|\s+ref|[.,]|$)/i,
    // "Txn at <name>"
    /txn\s+at\s+([A-Za-z0-9][A-Za-z0-9\s\-_'.]+?)(?:\s+on\s|\s+ref|[.,]|$)/i,
  ];

  const stopWords = /^(card|account|your|bank|available|balance|amt|ref|upi|vpa|pos|atm|neft|imps|rtgs|the|a|an)$/i;

  let merchant = 'Bank Transaction';
  for (const regex of merchantPatterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      const candidate = match[1].trim().replace(/[*#.\-]+$/, '').trim();
      const firstWord = candidate.split(/\s+/)[0];
      if (candidate.length >= 2 && !stopWords.test(firstWord) && candidate.length <= 50) {
        merchant = candidate;
        break;
      }
    }
  }

  // ── 4. Category from FULL SMS body (not just merchant name) ───────────────
  const bodyForCategory = lower; // entire raw SMS in lowercase

  const categoryMap: Record<string, string[]> = {
    FOOD: [
      'zomato', 'swiggy', 'mcdonald', 'domino', 'pizza', 'kfc', 'burger', 'starbucks',
      'restaurant', 'cafe', 'food', 'bakery', 'biryani', 'canteen', 'eatery', 'dine',
      'hungry', 'eats', 'barbeque', 'lunch', 'dinner', 'breakfast', 'snack',
    ],
    RENT: ['rent', 'landlord', 'housing', 'pg', 'flat rent', 'house rent'],
    TRANSPORT: [
      'uber', 'ola', 'rapido', 'irctc', 'railway', 'metro', 'petrol', 'fuel', 'pump',
      'shell', 'hpcl', 'bpcl', 'indane', 'travel', 'flight', 'airline', 'bus', 'auto',
      'cab', 'taxi', 'namma metro', 'bmtc', 'fastag',
    ],
    SHOPPING: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'dmart', 'reliance', 'nykaa',
      'retail', 'clothing', 'fashion', 'grocery', 'supermarket', 'blinkit',
      'zepto', 'instamart', 'meesho', 'snapdeal', 'shopsy', 'tata cliq',
    ],
    BILLS: [
      'electricity', 'water bill', 'recharge', 'jio', 'airtel', 'vi telecom',
      'broadband', 'act ', 'insurance', 'bescom', 'tneb', 'mseb', 'bill payment',
      'postpaid', 'prepaid', 'dthdth', 'tata sky', 'd2h',
    ],
    ENTERTAINMENT: [
      'netflix', 'spotify', 'prime video', 'hotstar', 'disney', 'cinema',
      'pvr', 'inox', 'bookmyshow', 'gaming', 'steam', 'playstation', 'club',
      'bar', 'pub', 'concert', 'event', 'show',
    ],
    HEALTH: [
      'apollo', 'pharmacy', 'chemist', 'hospital', 'clinic', 'medical', 'doctor',
      'pharmeasy', 'medplus', 'healthkart', 'diagnostic', 'lab test', 'netmeds',
    ],
  };

  let category = 'OTHER';
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => bodyForCategory.includes(kw))) {
      category = cat;
      break;
    }
  }

  return { amount, merchant, category };
}
