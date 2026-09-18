// next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    mustChangePassword: boolean;
    username: string;  // add this
  }

  interface Session {
    user: {
      role: string;
      mustChangePassword: boolean;
      username: string;  // add this
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    mustChangePassword?: boolean;
    username?: string;  // add this
  }
}