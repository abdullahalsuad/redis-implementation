import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class PostService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis, // Inject Redis client
  ) {}

  //  CREATE POST
  async create(body: { title: string; content?: string }) {
    const post = await this.prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
      },
    });

    // Clear cached list after creating new post
    await this.redis.del('cache:posts:all');

    return post;
  }

  // GET ALL POSTS WITH TOTAL COUNT
  async findAll() {
    const cacheKey = 'cache:posts:all';

    // Check Redis cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      // If cached, return immediately (fast!)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(cached);
    }

    // If not cached, fetch from database
    const posts = await this.prisma.post.findMany();
    const totalCount = await this.prisma.post.count();

    const result = { totalCount, posts };

    // Save result in Redis with TTL = 30 seconds
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30);

    return result;
  }

  // DELETE POST
  async delete(id: number) {
    const deleted = await this.prisma.post.delete({
      where: { id },
    });

    // Clear cached list after deletion
    await this.redis.del('cache:posts:all');

    return deleted;
  }
}
