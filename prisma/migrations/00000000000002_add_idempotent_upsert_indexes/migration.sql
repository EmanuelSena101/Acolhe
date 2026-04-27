-- CreateIndex for idempotent upserts
CREATE UNIQUE INDEX "Morador_domicilioId_externalId_key" ON "Morador"("domicilioId", "externalId");
CREATE UNIQUE INDEX "Visita_domicilioId_externalId_key" ON "Visita"("domicilioId", "externalId");
