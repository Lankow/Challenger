import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total, validateActivity, uniqueActivities } from './domain';
test('sumuje dystanse bez błędów zmiennoprzecinkowych', () => {
  const distances = [10.01,9.36,10.23,2.46,10.18,2.40,10.03,10.19,8.17,2.41,8.17,7.74,6.01,1.88,3.03,5.20,3.23];
  assert.equal(total(distances.map(distance => validateActivity({date:'2026-11-01',sport:'Bieganie',distance},'p'))),110.7);
});
test('odrzuca błędne dane i nieistniejące daty', () => {
  for (const distance of [-1,0,NaN,Infinity,'10']) assert.throws(() => validateActivity({date:'2026-11-01',sport:'Bieganie',distance},'p'));
  assert.throws(() => validateActivity({date:'2026-02-30',sport:'Bieganie',distance:1},'p'));
});
test('ponowny import nie powiela treningów', () => {
  const a = validateActivity({date:'2026-11-01',sport:'Bieganie',distance:10},'p');
  assert.equal(uniqueActivities([a],[{...a,id:'other'}]).length,0);
  assert.equal(uniqueActivities([a],[{...a,profileId:'other'}]).length,1);
});
