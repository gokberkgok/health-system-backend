/*
  Warnings:

  - Added the required column `clientType` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ipAddress` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAgent` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `clientType` ENUM('WEB', 'MOBILE', 'ADMIN') NOT NULL,
    ADD COLUMN `companyId` VARCHAR(191) NOT NULL,
    ADD COLUMN `deviceId` VARCHAR(255) NULL,
    ADD COLUMN `deviceName` VARCHAR(255) NULL,
    ADD COLUMN `ipAddress` VARCHAR(45) NOT NULL,
    ADD COLUMN `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `revokedAt` DATETIME(3) NULL,
    ADD COLUMN `userAgent` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `logs` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'TOKEN_REVOKED', 'FORBIDDEN_MOBILE_LOGIN', 'FORBIDDEN_PLAN_ACCESS', 'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER', 'CREATE_APPOINTMENT', 'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'CREATE_PAYMENT', 'DELETE_PAYMENT', 'CHANGE_PLAN', 'CREATE_USER', 'DELETE_USER') NOT NULL,
    `clientType` ENUM('WEB', 'MOBILE', 'ADMIN') NOT NULL,
    `ipAddress` VARCHAR(45) NOT NULL,
    `deviceId` VARCHAR(255) NULL,
    `userAgent` TEXT NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `logs_companyId_idx`(`companyId`),
    INDEX `logs_userId_idx`(`userId`),
    INDEX `logs_action_idx`(`action`),
    INDEX `logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `refresh_tokens_companyId_idx` ON `refresh_tokens`(`companyId`);

-- CreateIndex
CREATE INDEX `refresh_tokens_tokenHash_idx` ON `refresh_tokens`(`tokenHash`);

-- CreateIndex
CREATE INDEX `refresh_tokens_deviceId_idx` ON `refresh_tokens`(`deviceId`);

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
