-- CreateTable
CREATE TABLE "_PatientToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PatientToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PatientToUser_B_index" ON "_PatientToUser"("B");

-- AddForeignKey
ALTER TABLE "_PatientToUser" ADD CONSTRAINT "_PatientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientToUser" ADD CONSTRAINT "_PatientToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
