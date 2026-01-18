import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { LeadDto } from '../src/leads/dto/lead.dto';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lead } from '../src/leads/lead.entity';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const leadRepository = moduleFixture.get<Repository<Lead>>(
      getRepositoryToken(Lead),
    );
    await leadRepository.clear();

    const loginResponse = (await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'password',
      })
      .expect(201)) as { body: LoginResponseDto };

    authToken = loginResponse.body.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('/auth/login (POST) - should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'password',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('token_type', 'Bearer');
          expect(res.body).toHaveProperty('expires_in', 3600);
        });
    });

    it('/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: '',
          password: '',
        })
        .expect(401);
    });
  });

  describe('Leads API', () => {
    const testLead = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      cell: '098-765-4321',
      picture_large: 'https://example.com/picture.jpg',
    };

    it('/leads (GET) - should return empty array initially', () => {
      return request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect([]);
    });

    it('/create-lead (POST) - should create a new lead', () => {
      return request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead)
        .expect(201)
        .expect((res) => {
          const body = res.body as LeadDto;
          expect(body).toHaveProperty('id');
          expect(body.first_name).toBe(testLead.first_name);
          expect(body.last_name).toBe(testLead.last_name);
          expect(body.email).toBe(testLead.email);
        });
    });

    it('/create-lead (POST) - should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);

      return request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead)
        .expect(409);
    });

    it('/create-lead (POST) - should fail without auth token', () => {
      return request(app.getHttpServer())
        .post('/create-lead')
        .send(testLead)
        .expect(401);
    });

    it('/leads (GET) - should return leads after creation', async () => {
      await request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);

      return request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as LeadDto[];
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          expect(body[0]).toHaveProperty('id');
          expect(body[0].email).toBe(testLead.email);
        });
    });

    it('/leads/:id (GET) - should return specific lead', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);

      const leadId = (createResponse.body as LeadDto).id;

      return request(app.getHttpServer())
        .get(`/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as LeadDto;
          expect(body.id).toBe(leadId);
          expect(body.email).toBe(testLead.email);
        });
    });

    it('/leads/:id (GET) - should fail with invalid id', () => {
      return request(app.getHttpServer())
        .get('/leads/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('/leads/:id/summarize (POST) - should generate AI summary', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/create-lead')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);

      const leadId = (createResponse.body as LeadDto).id;

      return request(app.getHttpServer())
        .post(`/leads/${leadId}/summarize`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('summary');
          expect(res.body).toHaveProperty('next_action');
        });
    });
  });

  describe('Health Check', () => {
    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as { status: string; details: any };
          expect(body).toHaveProperty('status');
          expect(body.status).toBe('ok');
        });
    });
  });

  describe('Root endpoint', () => {
    it('/ (GET) - should return hello world', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });
});
