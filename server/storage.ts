import {
  targets,
  results,
  notificationChannels,
  awsAccounts,
  users,
  type Target,
  type InsertTarget,
  type Result,
  type InsertResult,
  type NotificationChannel,
  type InsertNotificationChannel,
  type AwsAccount,
  type InsertAwsAccount,
  type User,
  type InsertUser,
  type SafeUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto-utils";

export interface IStorage {
  // Target operations
  getAllTargets(): Promise<Target[]>;
  getTarget(id: number): Promise<Target | undefined>;
  getEnabledTargets(): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, target: InsertTarget): Promise<void>;
  deleteTarget(id: number): Promise<void>;

  // Result operations
  createResult(result: InsertResult): Promise<Result>;
  getResultsByTarget(targetId: number, limit?: number): Promise<Result[]>;
  getLastResultsForTarget(targetId: number, count: number): Promise<Result[]>;

  // Notification channel operations
  getAllNotificationChannels(): Promise<NotificationChannel[]>;
  getNotificationChannel(id: number): Promise<NotificationChannel | undefined>;
  getEnabledNotificationChannels(): Promise<NotificationChannel[]>;
  createNotificationChannel(channel: InsertNotificationChannel): Promise<NotificationChannel>;
  updateNotificationChannel(id: number, channel: InsertNotificationChannel): Promise<void>;
  deleteNotificationChannel(id: number): Promise<void>;

  // AWS account operations (client-safe - no credentials exposed)
  getAllAwsAccountsForClient(): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'>[]>;
  getAwsAccountForClient(id: number): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'> | undefined>;
  
  // AWS account operations (server-side only - includes decrypted credentials)
  getAwsAccountWithCredentials(id: number): Promise<AwsAccount | undefined>;
  createAwsAccount(account: InsertAwsAccount): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'>>;
  updateAwsAccount(id: number, account: Partial<InsertAwsAccount>): Promise<void>;
  deleteAwsAccount(id: number): Promise<void>;

  // User operations
  getAllUsers(): Promise<SafeUser[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { hashedPassword: string }): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<void>;
  deleteUser(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllTargets(): Promise<Target[]> {
    return db.select().from(targets).orderBy(desc(targets.id));
  }

  async getTarget(id: number): Promise<Target | undefined> {
    const [target] = await db.select().from(targets).where(eq(targets.id, id));
    return target || undefined;
  }

  async getEnabledTargets(): Promise<Target[]> {
    return db.select().from(targets).where(eq(targets.enabled, true));
  }

  async createTarget(insertTarget: InsertTarget): Promise<Target> {
    const [target] = await db
      .insert(targets)
      .values(insertTarget)
      .returning();
    return target;
  }

  async updateTarget(id: number, insertTarget: InsertTarget): Promise<void> {
    await db
      .update(targets)
      .set(insertTarget)
      .where(eq(targets.id, id));
  }

  async deleteTarget(id: number): Promise<void> {
    await db.delete(targets).where(eq(targets.id, id));
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const [result] = await db
      .insert(results)
      .values(insertResult)
      .returning();
    return result;
  }

  async getResultsByTarget(targetId: number, limit: number = 200): Promise<Result[]> {
    return db
      .select()
      .from(results)
      .where(eq(results.targetId, targetId))
      .orderBy(desc(results.id))
      .limit(limit);
  }

  async getLastResultsForTarget(targetId: number, count: number): Promise<Result[]> {
    return db
      .select()
      .from(results)
      .where(eq(results.targetId, targetId))
      .orderBy(desc(results.id))
      .limit(count);
  }

  async getAllNotificationChannels(): Promise<NotificationChannel[]> {
    return db.select().from(notificationChannels).orderBy(desc(notificationChannels.id));
  }

  async getNotificationChannel(id: number): Promise<NotificationChannel | undefined> {
    const [channel] = await db.select().from(notificationChannels).where(eq(notificationChannels.id, id));
    return channel || undefined;
  }

  async getEnabledNotificationChannels(): Promise<NotificationChannel[]> {
    return db.select().from(notificationChannels).where(eq(notificationChannels.enabled, true));
  }

  async createNotificationChannel(insertChannel: InsertNotificationChannel): Promise<NotificationChannel> {
    const [channel] = await db
      .insert(notificationChannels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async updateNotificationChannel(id: number, insertChannel: InsertNotificationChannel): Promise<void> {
    await db
      .update(notificationChannels)
      .set(insertChannel)
      .where(eq(notificationChannels.id, id));
  }

  async deleteNotificationChannel(id: number): Promise<void> {
    await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
  }

  // Client-safe methods - NO credentials exposed
  async getAllAwsAccountsForClient(): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'>[]> {
    const accounts = await db.select().from(awsAccounts).orderBy(desc(awsAccounts.id));
    return accounts.map(({ accessKeyId, secretAccessKey, ...account }) => account);
  }

  async getAwsAccountForClient(id: number): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'> | undefined> {
    const [account] = await db.select().from(awsAccounts).where(eq(awsAccounts.id, id));
    if (!account) return undefined;
    const { accessKeyId, secretAccessKey, ...safeAccount } = account;
    return safeAccount;
  }

  // Server-side only - includes decrypted credentials for CloudWatch queries
  async getAwsAccountWithCredentials(id: number): Promise<AwsAccount | undefined> {
    const [account] = await db.select().from(awsAccounts).where(eq(awsAccounts.id, id));
    if (!account) return undefined;
    return {
      ...account,
      accessKeyId: decrypt(account.accessKeyId),
      secretAccessKey: decrypt(account.secretAccessKey),
    };
  }

  async createAwsAccount(insertAccount: InsertAwsAccount): Promise<Omit<AwsAccount, 'accessKeyId' | 'secretAccessKey'>> {
    const encryptedAccount = {
      ...insertAccount,
      accessKeyId: encrypt(insertAccount.accessKeyId),
      secretAccessKey: encrypt(insertAccount.secretAccessKey),
    };
    
    const [account] = await db
      .insert(awsAccounts)
      .values(encryptedAccount)
      .returning();
    
    const { accessKeyId, secretAccessKey, ...safeAccount } = account;
    return safeAccount;
  }

  async updateAwsAccount(id: number, insertAccount: Partial<InsertAwsAccount>): Promise<void> {
    const updateData: any = { ...insertAccount };
    
    // Only encrypt credentials if they're being updated
    if (insertAccount.accessKeyId) {
      updateData.accessKeyId = encrypt(insertAccount.accessKeyId);
    }
    if (insertAccount.secretAccessKey) {
      updateData.secretAccessKey = encrypt(insertAccount.secretAccessKey);
    }
    
    await db
      .update(awsAccounts)
      .set(updateData)
      .where(eq(awsAccounts.id, id));
  }

  async deleteAwsAccount(id: number): Promise<void> {
    await db.delete(awsAccounts).where(eq(awsAccounts.id, id));
  }

  // User operations
  async getAllUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    return allUsers.map(({ password, twoFactorSecret, ...safeUser }) => safeUser);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: InsertUser & { hashedPassword: string }): Promise<User> {
    const { hashedPassword, ...userWithoutPassword } = userData;
    const [user] = await db
      .insert(users)
      .values({
        ...userWithoutPassword,
        password: hashedPassword,
        twoFactorEnabled: false,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
