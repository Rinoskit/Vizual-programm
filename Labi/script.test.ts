import { describe, it, expect } from 'vitest';
import {
  createUser,
  createBook,
  calculateArea,
  getStatusColor,
  capitalizeFirst,
  trimAndTransform,
  getFirstElement,
  findById
} from './script';

describe('createUser', () => {
  it('создаёт пользователя без email', () => {
    const user = createUser(1, 'Иван');
    expect(user).toEqual({ id: 1, name: 'Иван', isActive: true });
  });

  it('создаёт пользователя с email', () => {
    const user = createUser(2, 'Мария', 'maria@example.com');
    expect(user).toEqual({
      id: 2,
      name: 'Мария',
      email: 'maria@example.com',
      isActive: true
    });
  });
});

describe('createBook', () => {
  it('создаёт книгу со всеми полями', () => {
    const book = createBook({
      title: 'Война и мир',
      author: 'Лев Толстой',
      year: 1869,
      genre: 'fiction'
    });
    expect(book).toEqual({
      title: 'Война и мир',
      author: 'Лев Толстой',
      year: 1869,
      genre: 'fiction'
    });
  });

  it('создаёт книгу без года', () => {
    const book = createBook({
      title: '1984',
      author: 'Джордж Оруэлл',
      genre: 'fiction'
    });
    expect(book).toEqual({
      title: '1984',
      author: 'Джордж Оруэлл',
      genre: 'fiction'
    });
  });
});

describe('calculateArea', () => {
  it('считает площадь круга', () => {
    expect(calculateArea('circle', 5)).toBeCloseTo(78.5398, 4);
  });

  it('считает площадь квадрата', () => {
    expect(calculateArea('square', 4)).toBe(16);
  });
});

describe('getStatusColor', () => {
  it('возвращает правильные цвета статусов', () => {
    expect(getStatusColor('active')).toBe('green');
    expect(getStatusColor('inactive')).toBe('red');
    expect(getStatusColor('new')).toBe('yellow');
  });
});

describe('StringFormatter', () => {
  it('capitalizeFirst', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('hello', true)).toBe('HELLO');
  });

  it('trimAndTransform', () => {
    expect(trimAndTransform('  hello  ')).toBe('hello');
    expect(trimAndTransform('  hello  ', true)).toBe('HELLO');
  });
});

describe('getFirstElement', () => {
  it('возвращает первый элемент массива', () => {
    expect(getFirstElement([1, 2, 3])).toBe(1);
    expect(getFirstElement(['a', 'b'])).toBe('a');
  });

  it('возвращает undefined для пустого массива', () => {
    expect(getFirstElement([])).toBeUndefined();
  });
});

describe('findById', () => {
  const items = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' }
  ];

  it('находит элемент по id', () => {
    expect(findById(items, 2)).toEqual({ id: 2, name: 'B' });
  });

  it('возвращает undefined, если id не найден', () => {
    expect(findById(items, 999)).toBeUndefined();
  });
});