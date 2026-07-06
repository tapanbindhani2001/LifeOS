export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: string;
  transactionDate: string;
}

/**
 * Parses transactional SMS details (e.g. from Indian banks) to extract key expense details.
 */
export function parseBankSms(text: string): ParsedExpense | null {
  if (!text) return null;

  // 1. Look for debit triggers
  const isCredit = /credited|received|refunded|added to/i.test(text);
  if (isCredit) return null;

  const isDebit = /debited|spent|paid|transacted|charged|declined/i.test(text);
  if (!isDebit) {
    const hasAmount = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i.test(text);
    if (!hasAmount) return null;
  }

  // 2. Extract Amount
  const amountRegex = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Extract Merchant Name
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
      if (candidate.length > 2 && !/^(card|account|your|bank|available|balance|amt|ref)$/i.test(candidate)) {
        merchant = candidate;
        break;
      }
    }
  }

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

  const transactionDate = new Date().toISOString().slice(0, 10);

  return {
    amount,
    merchant,
    category,
    transactionDate
  };
}
