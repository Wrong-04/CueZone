import api from "./api";

export interface WaitlistEntry {
  _id: string;
  id?: string;
  customerName: string;
  phone: string;
  guests: number;
  preferredType: string;
  status: "waiting" | "seated" | "cancelled";
  note?: string;
  joinedTime: string;
  assignedTableId?: string;
  createdAt?: string;
}

export const waitlistService = {
  async createPublic(payload: {
    customerName: string;
    phone: string;
    guests: number;
    preferredType: string;
    note?: string;
  }): Promise<WaitlistEntry> {
    const res = await api.post("/public/waitlist", payload);
    return res.data?.data || res.data;
  },

  async getAll(): Promise<WaitlistEntry[]> {
    const res = await api.get("/waitlist");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  async create(payload: {
    customerName: string;
    phone: string;
    guests: number;
    preferredType: string;
    note?: string;
  }): Promise<WaitlistEntry> {
    const res = await api.post("/waitlist", payload);
    return res.data?.data || res.data;
  },

  async updateStatus(
    id: string,
    status: "waiting" | "seated" | "cancelled",
    assignedTableId?: string,
  ): Promise<WaitlistEntry> {
    const res = await api.patch(`/waitlist/${id}/status`, { status, assignedTableId });
    return res.data?.data || res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/waitlist/${id}`);
  },
};
