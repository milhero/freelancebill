export type ProjectStatus = 'active' | 'completed';

export interface Project {
  id: string;
  userId: string;
  clientId: string | null;
  name: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreate {
  clientId?: string;
  name: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export type ProjectUpdate = Partial<ProjectCreate>;
