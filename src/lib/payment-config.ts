export type PaymentMethod = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

// TODO: replace with your real accounts / QR later
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "kbank",
    bankName: "กสิกรไทย (KBank)",
    accountName: "รวยไม่ไหว",
    accountNumber: "xxx-x-xxxxx-x",
  },
  {
    id: "scb",
    bankName: "ไทยพาณิชย์ (SCB)",
    accountName: "รวยไม่ไหว",
    accountNumber: "xxx-x-xxxxx-x",
  },
  {
    id: "bbl",
    bankName: "กรุงเทพ (BBL)",
    accountName: "รวยไม่ไหว",
    accountNumber: "xxx-x-xxxxx-x",
  },
];

