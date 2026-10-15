export interface FeeReceiptData {
  receiptNo: string;
  admissionNo: string;
  studentName: string;
  studentPhone: string;
  district: string;
  courseTitle: string;
  courseId: string;
  amount: number;
  amountInWords: string;
  paymentMode: string;
  upiTxId: string;
  paymentDate: string;
  academicYear: string;
  status: "VERIFIED" | "APPROVED" | "PENDING";
  issuedBy: string;
}

/**
 * Convert numbers to Indian Rupees in words
 */
export function numberToWordsInr(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (amount === 0) return "Rupees Zero Only";

  function convertTwoDigits(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]} ${unit ? units[unit] : ""}`.trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) res += `${units[hundred]} Hundred `;
    if (rest > 0) res += convertTwoDigits(rest);
    return res.trim();
  }

  const thousands = Math.floor(amount / 1000);
  const remainder = amount % 1000;

  let words = "Rupees ";
  if (thousands > 0) {
    words += `${convertTwoDigits(thousands)} Thousand `;
  }
  if (remainder > 0) {
    words += convertThreeDigits(remainder);
  }

  return `${words.trim()} Only`;
}

/**
 * Generate a consistent Receipt Number
 */
export function generateReceiptNumber(seed?: string): string {
  const hash = seed
    ? Math.abs(seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 9000 + 1000
    : Math.floor(1000 + Math.random() * 9000);
  return `HA-RCP-2026-${hash}`;
}

/**
 * Generate an Admission Number
 */
export function generateAdmissionNumber(seed?: string): string {
  const hash = seed
    ? Math.abs(seed.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 9000 + 1000
    : Math.floor(1000 + Math.random() * 9000);
  return `HA-ADM-${hash}`;
}

/**
 * Build Fee Receipt object from student & payment data
 */
export function buildFeeReceipt(
  student: {
    id?: string;
    fullName: string;
    whatsappNum: string;
    district?: string;
  },
  payment: {
    id?: string;
    courseChoice: string;
    courseId?: string;
    amount?: number;
    upiTxId?: string;
    paymentStatus?: string;
    registrationDate?: string;
  }
): FeeReceiptData {
  const seed = `${student.id || student.fullName}-${payment.id || payment.upiTxId || ""}`;
  const amount = payment.amount || 1500;

  return {
    receiptNo: generateReceiptNumber(seed),
    admissionNo: generateAdmissionNumber(seed),
    studentName: student.fullName,
    studentPhone: student.whatsappNum,
    district: student.district || "Kerala",
    courseTitle: payment.courseChoice,
    courseId: payment.courseId || "adaviyya",
    amount,
    amountInWords: numberToWordsInr(amount),
    paymentMode: "UPI / Bank Transfer",
    upiTxId: payment.upiTxId && payment.upiTxId !== "Pending Verification" ? payment.upiTxId : "UPI-VERIFIED",
    paymentDate: payment.registrationDate
      ? new Date(payment.registrationDate).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    academicYear: "2026 – 2027",
    status: payment.paymentStatus === "APPROVED" ? "APPROVED" : "PENDING",
    issuedBy: "Office of Academic Admissions & Registrar",
  };
}

/**
 * Pre-filled WhatsApp Fee Receipt Confirmation message
 */
export function getWhatsAppFeeReceiptUrl(receipt: FeeReceiptData): string {
  const digits = receipt.studentPhone.replace(/\D/g, "");
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

  const message = `*HANOON ACADEMY | വിജ്ഞാന വെളിച്ചം* 🎓
*OFFICIAL ADMISSION & FEE RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *Receipt No:* \`${receipt.receiptNo}\`
🆔 *Admission No:* \`${receipt.admissionNo}\`
📅 *Date:* ${receipt.paymentDate}
🏛️ *Academic Session:* ${receipt.academicYear}

👤 *Student Name:* ${receipt.studentName}
📍 *District / Region:* ${receipt.district}
📚 *Enrolled Course:* *${receipt.courseTitle}*

💳 *Payment Details:*
• *Amount Paid:* *₹${receipt.amount.toLocaleString("en-IN")}*
• *Amount in Words:* ${receipt.amountInWords}
• *Payment Mode:* ${receipt.paymentMode}
• *UPI / UTR TxID:* \`${receipt.upiTxId}\`
• *Verification Status:* ✅ *VERIFIED & ADMITTED*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Course Access:* Portal live class streams, recorded lecture library, and PDF notes are now completely unlocked on your dashboard.

🌐 *Student Portal:* https://hanoonacademy.com/student
📞 *Admissions Desk:* +91 98460 12345
_Hanoon Academy — Islamic EdTech & Skill Mastery_`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
