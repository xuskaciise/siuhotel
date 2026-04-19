import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../utils/api-response';
import * as schemas from './transaction.schema';
import * as transactionService from './transaction.service';

export function registerTransactionRoutes(app: FastifyInstance): void {
  app.post('/transactions', async (request, reply) => {
    const body = schemas.createTransactionBodySchema.parse(request.body);
    const row = await transactionService.createTransaction(body);
    sendSuccess(reply, transactionService.formatTransactionResponse(row), 201);
  });

  app.get('/transactions', async (_request, reply) => {
    const rows = await transactionService.listTransactions();
    sendSuccess(reply, transactionService.formatTransactionListResponse(rows));
  });

  app.get('/transactions/:id', async (request, reply) => {
    const { id } = schemas.transactionIdParamsSchema.parse(request.params);
    const row = await transactionService.getTransactionById(id);
    sendSuccess(reply, transactionService.formatTransactionResponse(row));
  });

  app.put('/transactions/:id', async (request, reply) => {
    const { id } = schemas.transactionIdParamsSchema.parse(request.params);
    const body = schemas.updateTransactionBodySchema.parse(request.body);
    const row = await transactionService.updateTransaction(id, body);
    sendSuccess(reply, transactionService.formatTransactionResponse(row));
  });

  app.delete('/transactions/:id', async (request, reply) => {
    const { id } = schemas.transactionIdParamsSchema.parse(request.params);
    await transactionService.deleteTransaction(id);
    sendSuccess(reply, { deleted: true });
  });
}
