export interface Client {
  id: string;
  userId: string;
  name: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientCreate {
  name: string;
  addressStreet?: string;
  addressZip?: string;
  addressCity?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type ClientUpdate = Partial<ClientCreate>;
