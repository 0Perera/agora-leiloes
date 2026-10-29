import request from 'supertest';
import { start, type TestApp } from './app';

const LIMIT = 5;
const EMAIL = 'login@teste.dev';
const PASSWORD = 'senha-de-teste';

let api: TestApp;

beforeAll(async () => {
  api = await start({ throttle: true });
  await api.reset();
  await request(api.server)
    .post('/auth/signup')
    .send({ name: 'Login', email: EMAIL, password: PASSWORD, role: 'BIDDER' })
    .expect(201);
});

afterAll(async () => {
  await api.close();
});

function login(ip?: string): request.Test {
  const call = request(api.server).post('/auth/login');
  if (ip) call.set('CF-Connecting-IP', ip);
  return call.send({ email: EMAIL, password: PASSWORD });
}

async function attempts(count: number, ip?: string): Promise<number[]> {
  const statuses: number[] = [];
  for (let index = 0; index < count; index++) {
    statuses.push((await login(ip)).status);
  }
  return statuses;
}

describe('POST /auth/login', () => {
  it('responde normalmente às 5 tentativas do mesmo IP em 1 min', async () => {
    const statuses = await attempts(LIMIT, '203.0.113.1');

    expect(statuses).toEqual(Array(LIMIT).fill(200));
  });

  it('responde 429 TOO_MANY_ATTEMPTS à 6ª tentativa do mesmo IP', async () => {
    await attempts(LIMIT, '203.0.113.2');

    const response = await login('203.0.113.2');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ code: 'TOO_MANY_ATTEMPTS' });
  });

  it('conta cada CF-Connecting-IP à parte', async () => {
    await attempts(LIMIT, '203.0.113.3');

    const response = await login('203.0.113.4');

    expect(response.status).toBe(200);
  });

  it('conta pelo IP da conexão quando não há CF-Connecting-IP', async () => {
    const statuses = await attempts(LIMIT + 1);

    expect(statuses.at(-1)).toBe(429);
  });
});

describe('POST /auth/signup', () => {
  it('não tem limite de tentativas', async () => {
    const statuses: number[] = [];
    for (let index = 0; index <= LIMIT; index++) {
      const response = await request(api.server)
        .post('/auth/signup')
        .send({
          name: 'Cadastro',
          email: `cadastro${index}@teste.dev`,
          password: PASSWORD,
          role: 'BIDDER',
        });
      statuses.push(response.status);
    }

    expect(statuses).toEqual(Array(LIMIT + 1).fill(201));
  });
});
