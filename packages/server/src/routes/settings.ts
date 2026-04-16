import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

const updateSettingsSchema = {
  body: Type.Object({
    fullName: Type.Optional(Type.String()),
    addressStreet: Type.Optional(Type.String()),
    addressZip: Type.Optional(Type.String()),
    addressCity: Type.Optional(Type.String()),
    email: Type.Optional(Type.String({ format: 'email' })),
    phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    iban: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    bic: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    bankName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    taxFreeAllowance: Type.Optional(Type.String()),
    defaultPaymentDays: Type.Optional(Type.Number()),
    defaultHourlyRate: Type.Optional(Type.String()),
    language: Type.Optional(Type.String()),
    taxMode: Type.Optional(Type.String()),
    taxRate: Type.Optional(Type.String()),
    taxId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    vatId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    invoiceTemplate: Type.Optional(Type.String()),
    invoiceAccentColor: Type.Optional(Type.String()),
  }),
};

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await getSettings(request.userId);
    return reply.send({ data: result });
  });

  app.put('/api/settings', { preHandler: [requireAuth], schema: updateSettingsSchema }, async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await updateSettings(request.userId, data);
    return reply.send({ data: result });
  });
}
