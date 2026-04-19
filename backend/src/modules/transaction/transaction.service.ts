import {
  PaymentMethod,
  Prisma,
  TransactionStatus,
  type Transaction as PaymentTransaction,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/app-error';
import type { CreateTransactionInput, UpdateTransactionInput } from './transaction.schema';

function isPrismaKnownError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export type PaymentTransactionResponse = Omit<PaymentTransaction, 'amount'> & {
  amount: string;
};

function formatTx(row: PaymentTransaction): PaymentTransactionResponse {
  return {
    ...row,
    amount: row.amount.toFixed(2),
  };
}

export function formatTransactionResponse(row: PaymentTransaction): PaymentTransactionResponse {
  return formatTx(row);
}

export function formatTransactionListResponse(
  rows: PaymentTransaction[],
): PaymentTransactionResponse[] {
  return rows.map(formatTx);
}

export async function createTransaction(input: CreateTransactionInput): Promise<PaymentTransaction> {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (booking === null) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const data: Prisma.TransactionCreateInput = {
    booking: { connect: { id: input.bookingId } },
    amount: new Prisma.Decimal(input.amount),
    paymentMethod: input.paymentMethod as PaymentMethod,
    status: input.status ?? TransactionStatus.COMPLETED,
  };

  try {
    return await prisma.transaction.create({ data });
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === 'P2003') {
      throw new AppError(400, 'INVALID_BOOKING', 'Booking does not exist');
    }
    throw err;
  }
}

export async function listTransactions(): Promise<PaymentTransaction[]> {
  return prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTransactionById(id: string): Promise<PaymentTransaction> {
  const row = await prisma.transaction.findUnique({ where: { id } });
  if (row === null) {
    throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }
  return row;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<PaymentTransaction> {
  await getTransactionById(id);
  const data: Prisma.TransactionUpdateInput = {};
  if (input.amount !== undefined) {
    data.amount = new Prisma.Decimal(input.amount);
  }
  if (input.paymentMethod !== undefined) {
    data.paymentMethod = input.paymentMethod;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  return prisma.transaction.update({
    where: { id },
    data,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await getTransactionById(id);
  await prisma.transaction.delete({ where: { id } });
}
