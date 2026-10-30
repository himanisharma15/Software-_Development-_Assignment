CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "googleId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Sender" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "smtpHost" TEXT NOT NULL,
  "smtpPort" INTEGER NOT NULL,
  "smtpUser" TEXT NOT NULL,
  "smtpPass" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sender_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Campaign" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "delayBetweenMs" INTEGER NOT NULL,
  "hourlyLimit" INTEGER,
  "totalCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Email" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT,
  "userId" TEXT NOT NULL,
  "senderId" TEXT,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "messageId" TEXT,
  "previewUrl" TEXT,
  "jobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Email_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Sender"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "SlackConnection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "teamId" TEXT,
  "teamName" TEXT,
  "channelId" TEXT,
  "accessToken" TEXT,
  "webhookUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlackConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Email_userId_status_scheduledAt_idx"
ON "Email" ("userId", "status", "scheduledAt");

CREATE UNIQUE INDEX "Email_jobId_key"
ON "Email" ("jobId");
