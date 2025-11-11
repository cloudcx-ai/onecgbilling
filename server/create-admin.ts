import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  const adminUsername = "admin";
  const adminPassword = "admin123"; // Change this after first login!
  const adminEmail = "admin@cloudcx.local";

  try {
    // Check if admin user already exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, adminUsername));
    
    if (existingAdmin) {
      console.log("Admin user already exists!");
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const [admin] = await db
      .insert(users)
      .values({
        username: adminUsername,
        password: hashedPassword,
        email: adminEmail,
        role: "admin",
        twoFactorEnabled: false,
      })
      .returning();

    console.log("✓ Admin user created successfully!");
    console.log("Username:", adminUsername);
    console.log("Password:", adminPassword);
    console.log("Email:", adminEmail);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createAdminUser();
