// Local authentication bypass for development
// This replaces the Replit OIDC authentication with a simple local setup

import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Simple bypass middleware for local development
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // For local development, we'll create a mock user
  (req as any).user = {
    claims: {
      sub: "local-user", // Local user ID
      email: "developer@localhost",
      name: "Local Developer"
    }
  };
  next();
};

// Setup function that does nothing for local development
export async function setupAuth(app: Express): Promise<void> {
  console.log("Running in local development mode - auth is bypassed");
  // Ensure a local user exists to satisfy FK constraints
  const LOCAL_ID = "local-user";
  try {
    await storage.upsertUser({
      id: LOCAL_ID,
      email: "developer@localhost",
      firstName: "Local",
      lastName: "Developer",
    });
    console.log("Ensured local mock user exists in storage (id=local-user)");
  } catch (err) {
    console.warn("Could not ensure local user exists:", err);
  }
}

// Mock authenticated check
export const isAuthenticatedCheck = (req: Request): boolean => {
  return true; // Always authenticated in local mode
};