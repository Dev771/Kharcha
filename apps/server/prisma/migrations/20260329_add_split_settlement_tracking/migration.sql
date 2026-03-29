-- Add settlement tracking to expense_splits
ALTER TABLE "expense_splits" ADD COLUMN "is_settled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expense_splits" ADD COLUMN "settled_at" TIMESTAMPTZ;

-- Index for querying unsettled splits per user
CREATE INDEX "expense_splits_user_id_is_settled_idx" ON "expense_splits"("user_id", "is_settled");

-- Drop old participantId index (replaced by composite)
DROP INDEX IF EXISTS "expense_splits_participant_id_idx";
