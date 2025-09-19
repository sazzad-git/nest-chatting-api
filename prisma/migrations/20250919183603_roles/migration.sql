-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "roles" "public"."Role"[] DEFAULT ARRAY['USER']::"public"."Role"[];
