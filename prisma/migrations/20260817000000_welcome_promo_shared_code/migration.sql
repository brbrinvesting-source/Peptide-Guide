-- DropIndex
DROP INDEX "WelcomePromotion_promoCodeId_key";

-- CreateIndex
CREATE INDEX "WelcomePromotion_promoCodeId_idx" ON "WelcomePromotion"("promoCodeId");

