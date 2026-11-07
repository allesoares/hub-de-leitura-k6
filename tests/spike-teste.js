import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';

export const options = {
  vus: 0,
  // Cada estágio define a duração e o total de usuários virtuais.
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 400 },
    { duration: '20s', target: 400 },
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>=0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/books?category=Fantasia&available=true&limit=20&offset=0&orderBy=title&order=ASC`,
    { timeout: '10s' },
  );

  // Se a API retornar um erro sem JSON, os checks ainda registram a falha.
  let data = {};
  try {
    data = response.json();
  } catch {
    data = {};
  }
  const books = data && data.books;

  check(response, {
    'status 200': (r) => r.status === 200,
    'resposta contém lista de livros': () => Array.isArray(books),
    'lista contém de 1 a 20 livros': () =>
      Array.isArray(books) && books.length > 0 && books.length <= 20,
    'livros da categoria Fantasia': () =>
      Array.isArray(books) && books.length > 0 &&
      books.every((book) => book.category === 'Fantasia'),
    'livros disponíveis': () =>
      Array.isArray(books) && books.length > 0 &&
      books.every((book) => book.available_copies > 0),
    'títulos em ordem crescente': () =>
      Array.isArray(books) && books.length > 0 &&
      books.every((book, index) =>
        typeof book.title === 'string' &&
        (index === 0 || books[index - 1].title <= book.title)),
  });

  sleep(1);
}
