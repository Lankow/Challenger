import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total, validateActivity, uniqueActivities, challengeActivities, validateChallengeDates } from './domain';
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

test('challenge dates include both boundaries and exclude outside activities', () => {
 const activities=['2026-10-31','2026-11-01','2026-11-02','2026-11-03'].map((date,index)=>({...validateActivity({date,sport:'Bieganie',distance:index+1},'p'),source:'app' as const}));
 const selected=challengeActivities(activities,{startDate:'2026-11-01',endDate:'2026-11-02'});
 assert.deepEqual(selected.map(a=>a.date),['2026-11-01','2026-11-02']);assert.equal(total(selected),5);
 assert.equal(challengeActivities(activities,{startDate:'2026-11-02',endDate:'2026-11-02'}).length,1);
 assert.equal(challengeActivities(activities,{startDate:'2026-11-02'}).length,2);
 assert.equal(challengeActivities(activities,{endDate:'2026-11-01'}).length,2);
 assert.equal(challengeActivities(activities,{}).length,4);
 assert.equal(challengeActivities(activities,{startDate:'2027-01-01'}).length,0);
});
test('challenge schedule rejects impossible and reversed dates', () => {
 assert.throws(()=>validateChallengeDates({startDate:'2026-02-30'}),/Invalid start/);
 assert.throws(()=>validateChallengeDates({endDate:'invalid'}),/Invalid end/);
 assert.throws(()=>validateChallengeDates({startDate:'2026-11-02',endDate:'2026-11-01'}),/on or before/);
 assert.doesNotThrow(()=>validateChallengeDates({startDate:'2026-11-01',endDate:'2026-11-01'}));
 assert.doesNotThrow(()=>validateChallengeDates({}));
});
