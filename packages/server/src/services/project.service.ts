import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { NotFoundError } from '../utils/errors.js';

type ProjectCreate = {
  name: string;
  clientId?: string | null;
  status?: 'active' | 'completed';
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export async function getProjects(userId: string, clientId?: string, status?: string) {
  const conditions = [eq(projects.userId, userId)];

  if (clientId) {
    conditions.push(eq(projects.clientId, clientId));
  }
  if (status) {
    conditions.push(eq(projects.status, status as 'active' | 'completed'));
  }

  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt));
}

export async function getProject(userId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Project');
  }

  return row;
}

export async function createProject(userId: string, data: ProjectCreate) {
  const [created] = await db
    .insert(projects)
    .values({ ...data, userId })
    .returning();

  return created;
}

export async function updateProject(userId: string, projectId: string, data: Partial<ProjectCreate>) {
  const [updated] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Project');
  }

  return updated;
}

export async function deleteProject(userId: string, projectId: string) {
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError('Project');
  }

  return deleted;
}
