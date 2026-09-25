// Private, device-local coaching notes and daily recovery/intake records.
import * as db from '../js/db.js';
import { dateKey } from '../js/body.js';
export const PROFILE_KEY='form.personal.v1', CHECKIN_KEY='form.checkins.v1';
export let profile=null, checkins=[];
const str=(x,n=12000)=>typeof x==='string'&&x.length<=n;
const num=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const optional=(x,a,b)=>x==null||num(x,a,b);
export function validateProfile(p){
  if(!p||p.kind!=='form-training-profile'||p.version!==1||!str(p.name,60)||!optional(p.age,13,110)||!str(p.priority,1000)||!str(p.notes)||!Array.isArray(p.unknowns)||p.unknowns.length>30||!p.unknowns.every(x=>str(x,400))||!Array.isArray(p.routines)||p.routines.length>12)return false;
  return p.routines.every(r=>str(r.id,100)&&r.id&&str(r.name,80)&&Array.isArray(r.days)&&r.days.every(d=>Number.isInteger(d)&&d>=0&&d<7)&&Array.isArray(r.exercises)&&r.exercises.length>0&&r.exercises.length<=30&&r.exercises.every(e=>str(e.id,100)&&e.id&&str(e.name,80)&&str(e.equipment,40)&&Array.isArray(e.muscles)&&e.muscles.every(m=>str(m,30))&&optional(e.sets,1,20)&&(e.sets==null||Number.isInteger(e.sets))&&optional(e.kg,0,1500)&&(e.reps==null||Number.isInteger(e.reps)&&num(e.reps,1,300))&&['added','stack','unspecified'].includes(e.basis)));
}
export function routineRecords(p){return p.routines.map(r=>({id:r.id,name:r.name,days:r.days,createdAt:Date.now(),exercises:r.exercises.map(e=>({exerciseId:e.id,weightBasis:e.basis,weightHint:e.kg,sets:Array.from({length:e.sets||0},()=>({kg:e.kg,reps:e.reps??null}))}))}));}
export async function initPersonal(){profile=await db.get('meta',PROFILE_KEY)||null;checkins=await db.get('meta',CHECKIN_KEY)||[];}
export async function importProfile(p,catalog){
  if(!validateProfile(p)||p.checkins&&(!Array.isArray(p.checkins)||p.checkins.length>730||!p.checkins.every(validateCheckin)))throw Error('Invalid training profile');
  const routines=routineRecords(p),custom=p.routines.flatMap(r=>r.exercises).filter(e=>!catalog.get(e.id));
  await db.tx(['meta','routines','exercises','bodyweight'],'readwrite',s=>{s.meta.put(p,PROFILE_KEY);if(p.checkins){s.meta.put(p.checkins,CHECKIN_KEY);for(const c of p.checkins)if(c.weightKg!=null)s.bodyweight.put({date:c.date,kg:c.weightKg});}for(const r of routines)s.routines.put(r);for(const e of custom)s.exercises.put({id:e.id,en:e.name,da:e.da||e.name,muscles:e.muscles,equipment:e.equipment,aliases:e.aliases||[],custom:true});});
  profile=p;if(p.checkins)checkins=p.checkins;
}
export async function saveNotes(notes){if(!str(notes))throw Error('Notes too long');const next=profile?{...profile,notes}:{kind:'form-training-profile',version:1,name:'',age:null,priority:'',notes,unknowns:[],routines:[]};await db.put('meta',next,PROFILE_KEY);profile=next;}
export function validateCheckin(c){return !!c&&/^\d{4}-\d{2}-\d{2}$/.test(c.date)&&Number.isFinite(Date.parse(c.date))&&optional(c.weightKg,20,400)&&optional(c.kcal,0,20000)&&optional(c.protein,0,1000)&&optional(c.carbs,0,2000)&&optional(c.fat,0,1000)&&optional(c.sleep,0,24)&&optional(c.energy,1,5)&&optional(c.hunger,1,5)&&optional(c.wrestlingMinutes,0,600)&&optional(c.wrestlingEffort,1,10)&&str(c.note||'',2000);}
export async function saveCheckin(c){if(!validateCheckin(c))throw Error('Check the entered values');const list=[...checkins.filter(x=>x.date!==c.date),c].sort((a,b)=>a.date.localeCompare(b.date)).slice(-730);await db.tx(['meta','bodyweight'],'readwrite',s=>{s.meta.put(list,CHECKIN_KEY);if(c.weightKg!=null)s.bodyweight.put({date:c.date,kg:c.weightKg});});checkins=list;}
export function weightTrend(records,now=Date.now()){
  const current=[],previous=[];const today=new Date(dateKey(now)+'T12:00:00');
  for(const r of records){if(!num(r.kg??r.weightKg,20,400))continue;const age=Math.round((+today-+new Date(r.date+'T12:00:00'))/86400000);if(age>=0&&age<7)current.push(r.kg??r.weightKg);else if(age>=7&&age<14)previous.push(r.kg??r.weightKg);}
  const avg=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
  return {average:avg(current),previous:avg(previous),change:current.length>=3&&previous.length>=3?avg(current)-avg(previous):null,count:current.length,previousCount:previous.length};
}
export function personalContext(bodyweight=[]){
 const trend=weightTrend(bodyweight),parts=['PERSONAL COACHING CONTEXT (latest user-confirmed preferences take priority):'];
 if(profile){parts.push(`User: ${profile.name}; age: ${profile.age??'not supplied'}. Main priority: ${profile.priority}.`,profile.notes,`UNCONFIRMED: ${profile.unknowns.join('; ')}`,`USER-SUPPLIED TRAINING BASELINE, not completed workouts: ${JSON.stringify(profile.routines)}`);}
 parts.push('Do not invent calorie or macro targets. Unknown intake is missing data, not zero food. Compare multi-day weight trends and performance/recovery, not a single weigh-in. Distinguish added plate load from total system weight; machine numbers are not interchangeable. Include wrestling fatigue in advice. Ask for missing height, weight trend, intake, and activity when needed before calculating personal targets.');
 parts.push(`7-calendar-day bodyweight average: ${trend.average??'insufficient data'} kg (${trend.count} entries). Prior 7 days: ${trend.previous??'insufficient data'} kg (${trend.previousCount} entries). Change: ${trend.change??'insufficient coverage; require at least 3 entries in each week'} kg.`,`DAILY INTAKE AND RECOVERY (null means unreported; full-day values, not automatic targets): ${JSON.stringify(checkins.slice(-28))}`);
 return parts.join('\n');
}
