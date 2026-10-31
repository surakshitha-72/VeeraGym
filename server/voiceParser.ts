// Intelligent Rule-Based Voice Parser for VeeraGym
// Handles Indian English speech patterns, numbers as words, colloquial dates and terms

const NUMBER_WORDS: { [key: string]: string } = {
  zero: '0', oh: '0',
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
};

const MONTH_NAMES_MAP: { [key: string]: string } = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

export interface ExtractedVoiceCustomer {
  name: string;
  phone: string;
  weightKg: number;
  category: 'cardio' | 'non-cardio';
  monthlyFee: number;
  joiningDate: string;
  firstPaymentDate?: string;
  amountPaid?: number;
  paymentMethod?: string;
  notes?: string;
}

export function parseVoiceTranscriptRobust(transcript: string, fallbackDate: string): ExtractedVoiceCustomer {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // 1. Mobile Number extraction
  let phone = '';
  // Try 10 continuous digits first
  const digit10Match = lower.match(/\b([6-9]\d{9})\b/);
  if (digit10Match) {
    phone = digit10Match[1];
  } else {
    // Try spaces or hyphens between numbers
    const spacedMatch = lower.match(/\b([6-9][\d\s-]{9,15}\d)\b/);
    if (spacedMatch) {
      const clean = spacedMatch[1].replace(/[\s-]/g, '');
      if (clean.length === 10) phone = clean;
    }
  }

  // If still no phone, check for spoken number words
  if (!phone) {
    const tokens = lower.split(/[\s,]+/);
    let digitSeq = '';
    for (const t of tokens) {
      if (NUMBER_WORDS[t] !== undefined) {
        digitSeq += NUMBER_WORDS[t];
      } else if (/^\d+$/.test(t)) {
        digitSeq += t;
      }
    }
    if (digitSeq.length >= 10) {
      // Find 10 digits starting with 6, 7, 8, or 9
      const match = digitSeq.match(/([6-9]\d{9})/);
      if (match) phone = match[1];
      else phone = digitSeq.slice(0, 10);
    }
  }

  // Fallback placeholder phone if not spoken
  if (!phone) {
    phone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  }

  // 2. Weight extraction (kg / kilograms / weight 72)
  let weightKg = 70;
  const weightMatch = lower.match(/(?:weight|weighing|wt)?\s*(?:is|of|about)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms|kilos)?/);
  const explicitKgMatch = lower.match(/(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms|kilos)/);

  if (explicitKgMatch) {
    weightKg = parseFloat(explicitKgMatch[1]);
  } else if (weightMatch && parseFloat(weightMatch[1]) >= 30 && parseFloat(weightMatch[1]) <= 200) {
    weightKg = parseFloat(weightMatch[1]);
  }

  // 3. Category & Monthly Fee
  let category: 'cardio' | 'non-cardio' = 'non-cardio';
  let monthlyFee = 600;

  if (lower.includes('non-cardio') || lower.includes('non cardio') || lower.includes('without cardio') || lower.includes('600')) {
    category = 'non-cardio';
    monthlyFee = 600;
  } else if (lower.includes('cardio') || lower.includes('1000') || lower.includes('thousand')) {
    category = 'cardio';
    monthlyFee = 1000;
  }

  // 4. Amount Paid (accurately targeted to avoid phone numbers or years)
  let amountPaid = monthlyFee;
  const paidMatch = lower.match(/\b(?:paid|paying|received|pay|amount)\s*(?:of|is|rs\.?|inr|rupees)?\s*(\d{3,5})\b/) ||
                    lower.match(/\b(\d{3,5})\s*(?:rupees|rs\.?|inr)\b/);
  if (paidMatch) {
    const num = parseInt(paidMatch[1], 10);
    // Ignore 4-digit years like 2024, 2025, 2026, 2027 if not adjacent to "rupees" or "paid"
    if (num > 0 && num <= 50000 && !(num >= 2020 && num <= 2035 && !paidMatch[0].includes('rupee') && !paidMatch[0].includes('paid'))) {
      amountPaid = num;
      if (num >= 1000 && !lower.includes('non-cardio') && !lower.includes('non cardio')) {
        category = 'cardio';
        monthlyFee = 1000;
      }
    }
  }

  // 5. Payment Method (strictly boundary check so "cardio" does not match "card")
  let paymentMethod = 'UPI / GPay / PhonePe';
  if (/\b(?:cash)\b/.test(lower)) {
    paymentMethod = 'Cash';
  } else if (/\b(?:credit\s*card|debit\s*card|swipe|pos)\b/.test(lower) || (/\bcard\b/.test(lower) && !/\bcardio\b/.test(lower))) {
    paymentMethod = 'Card';
  } else if (/\b(?:bank|transfer|neft|rtgs|netbanking|cheque)\b/.test(lower)) {
    paymentMethod = 'Bank Transfer';
  } else if (/\b(?:upi|gpay|google\s*pay|phonepe|paytm|online)\b/.test(lower)) {
    paymentMethod = 'UPI / GPay / PhonePe';
  }

  // 6. Payment Date / Joining Date
  let paymentDate = fallbackDate;
  // Look for date pattern: 15th October 2026, 15 Oct 2026, etc.
  const dateWordMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})/);
  if (dateWordMatch) {
    const day = dateWordMatch[1].padStart(2, '0');
    const monthKey = dateWordMatch[2];
    const year = dateWordMatch[3];
    const month = MONTH_NAMES_MAP[monthKey];
    if (month) {
      paymentDate = `${year}-${month}-${day}`;
    }
  } else {
    // Look for YYYY-MM-DD or DD-MM-YYYY
    const numericDateMatch = lower.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/) || lower.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (numericDateMatch) {
      if (numericDateMatch[1].length === 4) {
        paymentDate = `${numericDateMatch[1]}-${numericDateMatch[2].padStart(2, '0')}-${numericDateMatch[3].padStart(2, '0')}`;
      } else {
        paymentDate = `${numericDateMatch[3]}-${numericDateMatch[2].padStart(2, '0')}-${numericDateMatch[1].padStart(2, '0')}`;
      }
    }
  }

  // 7. Customer Full Name Extraction
  // We extract the name by stripping action verbs and recognized fields
  let rawName = text;
  // Remove starting command: "add", "register", "create", "new customer", "member"
  rawName = rawName.replace(/^(?:please\s+)?(?:add|register|create|enroll|insert|enter)\s+(?:new\s+)?(?:customer|member|client|person)?\s*/i, '');
  rawName = rawName.replace(/^(?:customer|member|name\s+is)\s*/i, '');

  // Cut off at first occurrence of keywords like "weight", "mobile", "phone", "number", "cardio", "paid", etc.
  const splitKeywords = [
    /\b(?:weight|weighing|wt)\b/i,
    /\b(?:mobile|phone|number|contact)\b/i,
    /\b(?:non-cardio|non cardio|cardio)\b/i,
    /\b(?:paid|rupees|rs|fee|membership)\b/i,
    /\b(?:with|having|joining)\b/i,
  ];

  let nameCandidate = rawName;
  for (const kw of splitKeywords) {
    const parts = nameCandidate.split(kw);
    if (parts.length > 1 && parts[0].trim().length > 0) {
      nameCandidate = parts[0];
    }
  }

  // Clean trailing commas, punctuation
  nameCandidate = nameCandidate.replace(/[,;.\-–—]+$/, '').replace(/[,;]+/g, ' ').trim();

  // Capitalize each word properly
  let name = nameCandidate
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (!name || name.length < 2) {
    name = 'New Customer';
  }

  return {
    name,
    phone,
    weightKg,
    category,
    monthlyFee,
    joiningDate: paymentDate || fallbackDate,
    firstPaymentDate: paymentDate,
    amountPaid,
    paymentMethod,
    notes: `Voice registered: "${transcript}"`,
  };
}
