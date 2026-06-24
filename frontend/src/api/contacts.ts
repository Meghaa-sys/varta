import { api } from "../lib/api";
import type { Contact } from "../types";

export const fetchContacts = () =>
  api.get<{ contacts: Contact[] }>("/contacts").then((res) => res.data.contacts);

export const requestContact = (userId: string) =>
  api.post<{ contact: Contact }>("/contacts", { userId }).then((res) => res.data.contact);

export const acceptContact = (contactId: string) =>
  api.patch<{ contact: Contact }>(`/contacts/${contactId}/accept`).then((res) => res.data.contact);

export const removeContact = (contactId: string) => api.delete(`/contacts/${contactId}`);
