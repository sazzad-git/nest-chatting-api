-- AlterTable
ALTER TABLE "public"."UserInConversation" ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."_SeenMessages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SeenMessages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SeenMessages_B_index" ON "public"."_SeenMessages"("B");

-- AddForeignKey
ALTER TABLE "public"."_SeenMessages" ADD CONSTRAINT "_SeenMessages_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SeenMessages" ADD CONSTRAINT "_SeenMessages_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
