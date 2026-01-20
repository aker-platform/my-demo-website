"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Use a placeholder URL if not configured yet
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If Clerk is not configured, just render children without auth
  if (!clerkPublishableKey) {
    return <>{children}</>;
  }
  
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
