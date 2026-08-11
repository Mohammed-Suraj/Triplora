import { contactRepository } from '../repositories/contact.repository';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { parsePaginationQuery } from '../utils/pagination';
import type { ContactMessageDTO } from '../types';

export const contactService = {
  async create(input: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }): Promise<ContactMessageDTO> {
    const created = await contactRepository.create(input);
    return created;
  },

  async list(query: { page?: string; limit?: string }): Promise<{ items: ContactMessageDTO[]; meta: PaginationMeta }> {
    const pagination = parsePaginationQuery(query, { defaultLimit: 20, maxLimit: 100 });
    const [rows, total] = await Promise.all([
      contactRepository.findAll(pagination.skip, pagination.limit),
      contactRepository.count(),
    ]);
    return {
      items: rows,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },
};
