import type { CarItem, TargetId } from './types';

export const CARS: readonly CarItem[] = [
  {
    id: 'gclass',
    name: 'Mercedes-Benz G-Class',
    price: 25_000_000,
    quality: 'Легендарный',
    image: '/assets/gclass.png',
  },
  {
    id: 'lamborghini',
    name: 'Lamborghini',
    price: 50_000_000,
    quality: 'Легендарный',
    image: '/assets/lamborghini.png',
  },
];

export const SUCCESS_CHANCE = 50;
export const BALANCE = 0;

export function isTargetId(value: unknown): value is TargetId {
  return value === 'gclass' || value === 'lamborghini';
}

export function getCar(id: TargetId): CarItem {
  return CARS.find((item) => item.id === id)!;
}

export function formatCoins(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}
