-- Persiste status da validação CAR (ACTIVE|PENDING|CANCELLED)
ALTER TABLE "farms" ADD COLUMN "car_status" varchar(20);
