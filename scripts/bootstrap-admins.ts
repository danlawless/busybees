/**
 * Bootstrap Script: Promote Users to Admin & Set Staff Passwords
 *
 * Usage: npx tsx scripts/bootstrap-admins.ts
 *
 * This script:
 * 1. Looks up each user by email
 * 2. If they exist: promotes to admin role and sets staff password
 * 3. If they don't exist: creates auth user + profile with admin role
 * 4. Sets a temporary staff password (change via Admin > Settings > Staff Management)
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { Database } from "../src/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Admin users to bootstrap
const ADMIN_USERS = [
  { email: "danieljlawless@gmail.com", phone: "9789876257", name: "Daniel Lawless" },
  { email: "krista@busybeesipc.com", phone: "", name: "Krista" },
  { email: "tim@busybeesipc.com", phone: "", name: "Tim" },
];

// Temporary password - each admin should change this after first login
const TEMP_PASSWORD = "BusyBees2025!";

async function bootstrapAdmins() {
  console.log("Starting admin bootstrap...\n");

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);

  for (const admin of ADMIN_USERS) {
    console.log(`Processing: ${admin.email}`);

    // Check if user exists in users table by email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, phone, name, role, has_staff_password")
      .eq("email", admin.email)
      .single();

    if (existingUser) {
      // User exists - promote to admin and set staff password
      const updates: Record<string, unknown> = {
        role: "admin",
        staff_password_hash: passwordHash,
        has_staff_password: true,
      };

      // Fill in phone/name if missing
      if (!existingUser.phone && admin.phone) {
        updates.phone = admin.phone;
      }
      if (!existingUser.name && admin.name) {
        updates.name = admin.name;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", existingUser.id);

      if (updateError) {
        console.error(`  FAILED to update ${admin.email}:`, updateError.message);
        continue;
      }

      // Also update auth user metadata
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { role: "admin" },
      });

      console.log(`  Updated: ${admin.email} -> admin (was ${existingUser.role})`);
    } else {
      // User doesn't exist - create auth user + profile
      // Need a phone number for new users
      if (!admin.phone) {
        // Try to find by email in auth
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email === admin.email);

        if (authUser) {
          // Auth user exists but no profile - create profile
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              id: authUser.id,
              email: admin.email,
              phone: admin.phone || "0000000000",
              name: admin.name,
              role: "admin",
              staff_password_hash: passwordHash,
              has_staff_password: true,
            });

          if (insertError) {
            console.error(`  FAILED to create profile for ${admin.email}:`, insertError.message);
            continue;
          }

          // Update auth metadata
          await supabase.auth.admin.updateUserById(authUser.id, {
            user_metadata: { name: admin.name, role: "admin" },
          });

          console.log(`  Created profile for existing auth user: ${admin.email}`);
          continue;
        }
      }

      // Create new auth user
      const authPassword = `STAFF-${admin.phone || "0000000000"}-AUTH`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: authPassword,
        email_confirm: true,
        user_metadata: { name: admin.name, role: "admin" },
      });

      if (authError || !authData.user) {
        console.error(`  FAILED to create auth user ${admin.email}:`, authError?.message);
        continue;
      }

      // Create user profile
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: admin.email,
          phone: admin.phone || "0000000000",
          name: admin.name,
          role: "admin",
          staff_password_hash: passwordHash,
          has_staff_password: true,
        });

      if (insertError) {
        console.error(`  FAILED to create profile for ${admin.email}:`, insertError.message);
        // Clean up auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      console.log(`  Created new admin user: ${admin.email}`);
    }
  }

  console.log("\nBootstrap complete!");
  console.log(`\nTemporary staff password for all admins: ${TEMP_PASSWORD}`);
  console.log("Each admin should change their password via Admin > Settings > Staff Management.\n");
  console.log("Staff login: use phone number + this password on the POS staff login form.");
}

bootstrapAdmins()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  });
