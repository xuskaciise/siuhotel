import { Prisma, type Customer } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

import { hashPassword } from '../../lib/password';

import type {

  CreateWalkInCustomerInput,

  RegisterCustomerInput,

  UpdateCustomerInput,

} from './customer.schema';



function isPrismaKnownError(err: unknown): err is { code: string } {

  return typeof err === 'object' && err !== null && 'code' in err;

}



export type PublicCustomer = Omit<Customer, 'passwordHash'>;



export function toPublicCustomer(row: Customer): PublicCustomer {

  const { passwordHash: _p, ...rest } = row;

  return rest;

}



export async function createWalkInCustomer(input: CreateWalkInCustomerInput): Promise<PublicCustomer> {

  const data: Prisma.CustomerCreateInput = {

    fullName: input.fullName,

    phoneNumber: input.phoneNumber,

  };

  try {

    const row = await prisma.customer.create({ data });

    return toPublicCustomer(row);

  } catch (err) {

    if (isPrismaKnownError(err) && err.code === 'P2002') {

      throw new AppError(409, 'PHONE_NUMBER_TAKEN', 'A customer with this phone number already exists');

    }

    throw err;

  }

}



export async function registerAppCustomer(input: RegisterCustomerInput): Promise<PublicCustomer> {

  const email = input.email.toLowerCase().trim();

  const passwordHash = await hashPassword(input.password);

  try {

    const row = await prisma.customer.create({

      data: {

        fullName: input.fullName,

        phoneNumber: input.phoneNumber,

        email,

        passwordHash,

      },

    });

    return toPublicCustomer(row);

  } catch (err) {

    if (isPrismaKnownError(err) && err.code === 'P2002') {

      const meta = err as { meta?: { target?: string[] } };

      const target = meta.meta?.target?.join(' ') ?? '';

      if (target.includes('email')) {

        throw new AppError(409, 'EMAIL_TAKEN', 'A customer with this email already exists');

      }

      throw new AppError(409, 'PHONE_NUMBER_TAKEN', 'A customer with this phone number already exists');

    }

    throw err;

  }

}



export async function listCustomers(): Promise<PublicCustomer[]> {

  const rows = await prisma.customer.findMany({

    orderBy: { createdAt: 'desc' },

  });

  return rows.map(toPublicCustomer);

}



export async function getCustomerById(id: string): Promise<PublicCustomer> {

  const row = await prisma.customer.findUnique({ where: { id } });

  if (row === null) {

    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  }

  return toPublicCustomer(row);

}



export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<PublicCustomer> {

  await getCustomerById(id);

  const data: Prisma.CustomerUpdateInput = {};

  if (input.fullName !== undefined) {

    data.fullName = input.fullName;

  }

  if (input.phoneNumber !== undefined) {

    data.phoneNumber = input.phoneNumber;

  }

  if (input.email !== undefined) {

    data.email = input.email === null ? null : input.email.toLowerCase().trim();

  }

  if (input.password !== undefined) {

    data.passwordHash = await hashPassword(input.password);

  }

  if (input.idCard !== undefined) {

    data.idCard = input.idCard;

  }

  if (input.address !== undefined) {

    data.address = input.address;

  }

  try {

    const row = await prisma.customer.update({

      where: { id },

      data,

    });

    return toPublicCustomer(row);

  } catch (err) {

    if (isPrismaKnownError(err) && err.code === 'P2002') {

      const meta = err as { meta?: { target?: string[] } };

      const target = meta.meta?.target?.join(' ') ?? '';

      if (target.includes('email')) {

        throw new AppError(409, 'EMAIL_TAKEN', 'A customer with this email already exists');

      }

      throw new AppError(409, 'PHONE_NUMBER_TAKEN', 'A customer with this phone number already exists');

    }

    throw err;

  }

}



export async function deleteCustomer(id: string): Promise<void> {

  await getCustomerById(id);

  await prisma.customer.delete({ where: { id } });

}

