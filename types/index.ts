export type AppUserRole = "founder" | "team_admin" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: AppUserRole;
  createdAt: string;
}

export interface DiagnosisSession {
  id: string;
  ownerId: string;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}
