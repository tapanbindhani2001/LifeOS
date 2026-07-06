export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: string;
  transactionDate: string;
}

const CATEGORIES = [
  'FOOD', 'RENT', 'TRANSPORT', 'SHOPPING', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'OTHER'
];

/**
 * Parses transactional SMS details (e.g. from Indian banks) to extract key expense details.
 * Supports patterns:
 * - "debited by Rs 500 at Merchant"
 * - "spent INR 2,500.50 at Merchant"
 * - "transacted for Rs 150 at Merchant"
 */
export function parseBankSms(text: string): ParsedExpense | null {
  if (!text) return null;

  // 1. Look for debit triggers (debit, spent, paid, transacted, charged)
  // And avoid credit triggers (credited, received, refunded)
  const isCredit = /credited|received|refunded|added to/i.test(text);
  if (isCredit) return null;

  const isDebit = /debited|spent|paid|transacted|charged|declined/i.test(text);
  if (!isDebit) {
    // Fallback: Check if there's an amount and a merchant to try and parse anyway
    const hasAmount = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i.test(text);
    if (!hasAmount) return null;
  }

  // 2. Extract Amount
  // Matches: Rs. 500, Rs 500, INR 500, INR 5,000.50
  const amountRegex = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Extract Merchant Name
  // Common patterns: "at [Merchant] on", "to [Merchant] on", "info [Merchant] on", "vpa [Merchant]"
  const merchantRegexes = [
    /(?:at|to|info)\s+([A-Za-z0-9\s\-*.]+?)(?:\s+on|\s+using|\s+balance|\s+Ref|\.|\s+VPA)/i,
    /(?:paid\s+to|transacted\s+at)\s+([A-Za-z0-9\s\-*.]+?)(?:\s+on|\s+using|\.|\s+Ref)/i,
    /(?:VPA|UPI)\s+([A-Za-z0-9\s\-*.]+?)(?:\s+on|\.|\s+Ref)/i
  ];

  let merchant = 'Auto SMS Expense';
  for (const regex of merchantRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out common filler words or short codes if they are too generic
      if (candidate.length > 2 && !/^(card|account|your|bank|available|balance|amt|ref)$/i.test(candidate)) {
        merchant = candidate;
        break;
      }
    }
  }

  // Clean merchant name from trailing asterisks or punctuation
  merchant = merchant.replace(/[*#.-]+$/, '').trim();

  // 4. Infer Category from Merchant keywords
  let category = 'OTHER';
  const lowerMerchant = merchant.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    FOOD: ['zomato', 'swiggy', 'mcdonald', 'starbucks', 'restauran', 'cafe', 'food', 'bakery', 'pizza', 'burger', 'eats'],
    RENT: ['rent', 'landlord', 'housing', 'pg'],
    TRANSPORT: ['uber', 'ola', 'rapido', 'irctc', 'railway', 'metro', 'petrol', 'fuel', 'pump', 'shell', 'hpcl', 'bpcl', 'indane', 'travel', 'flight', 'airline'],
    SHOPPING: ['amazon', 'flipkart', 'myntra', 'ajio', 'dmart', 'reliance', 'nykaa', 'retail', 'clothing', 'fashion', 'grocery', 'supermarket', 'blinkit', 'zepto', 'instamart'],
    BILLS: ['electricity', 'water', 'recharge', 'jio', 'airtel', 'vi', 'telecom', 'broadband', 'act', 'insurance', 'bill', 'bescom', 'tneb'],
    ENTERTAINMENT: ['netflix', 'spotify', 'prime video', 'hotstar', 'cinema', 'pvr', 'inox', 'theatre', 'bookmyshow', 'gaming', 'steam', 'playstation', 'club', 'bar', 'pub'],
    HEALTH: ['apollo', 'pharmacy', 'chemist', 'hospital', 'clinic', 'medical', 'doctor', 'pharmeasy', 'medplus', 'health']
  };

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => lowerMerchant.includes(keyword))) {
      category = cat;
      break;
    }
  }

  // 5. Transaction Date
  // Default to today
  const transactionDate = new Date().toISOString().slice(0, 10);

  return {
    amount,
    merchant,
    category,
    transactionDate
  };
}
