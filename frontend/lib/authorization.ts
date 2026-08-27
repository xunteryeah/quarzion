import { env } from "@/db/runtime";

export type CustomerRole = "organization_admin" | "member" | "viewer";
export type Permission = "project:read" | "project:write" | "project:admin" | "run:queue";

const rolePermissions: Record<CustomerRole, ReadonlySet<Permission>> = {
  organization_admin: new Set(["project:read", "project:write", "project:admin", "run:queue"]),
  member: new Set(["project:read", "project:write", "run:queue"]),
  viewer: new Set(["project:read"]),
};

export function hasPermission(role: string, permission: Permission) {
  return role in rolePermissions && rolePermissions[role as CustomerRole].has(permission);
}

export async function projectAccess(userId: string, projectId: string) {
  return env.DB.prepare(`SELECT p.id AS projectId, p.organization_id AS organizationId, p.region, p.language, m.role
      FROM projects p JOIN organizations o ON o.id = p.organization_id
      JOIN organization_members m ON m.organization_id = p.organization_id
      WHERE p.id = ? AND p.status != 'archived' AND o.status = 'active'
        AND m.user_id = ? AND m.status = 'active' LIMIT 1`)
    .bind(projectId, userId)
    .first<{ projectId: string; organizationId: string; region: string; language: string; role: CustomerRole }>();
}

export function permissionForDashboardCommand(command: string): Permission | null {
  if (["retry_run", "queue_batch"].includes(command)) return "run:queue";
  if (["review_alias", "create_action", "update_action", "create_prompt"].includes(command)) return "project:write";
  if (command === "update_project") return "project:admin";
  return null;
}
