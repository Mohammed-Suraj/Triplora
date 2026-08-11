import { categoryRepository } from '../repositories/category.repository';

export const categoryService = {
  async list() {
    const categories = await categoryRepository.findAll();
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
    }));
  },
};
