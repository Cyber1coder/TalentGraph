import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from './index.js';
import {User,Company} from './models.js';

describe('recruiter job management API flow',()=>{
  const dbName=`talentgraph_recruiter_test_${process.pid}_${Date.now()}`;
  let server:ReturnType<typeof app.listen>,base:string,cookie:string,jobId:string,otherCookie:string,recruiterId:string;
  const headers=()=>({'Content-Type':'application/json','Origin':'http://localhost:5173',Cookie:cookie});
  const validJob={title:'Senior Product Designer',companyName:'Northwind Studio',description:'Lead product design across a collaborative team building thoughtful tools for customers.',responsibilities:['Lead product discovery and design delivery'],requiredSkills:[{name:'Figma'},{name:'Product strategy'}],preferredSkills:[{name:'Research'}],minExperience:4,maxExperience:10,location:{city:'Austin',state:'Texas',country:'United States'},workMode:'hybrid',employmentType:'full-time',salary:{min:110000,max:150000,currency:'USD'},deadline:new Date(Date.now()+30*86400000).toISOString()};
  beforeAll(async()=>{
    await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`);
    const passwordHash=await bcrypt.hash('integration-test-password',4);
    const recruiter=await User.create({name:'Integration Recruiter',email:`recruiter-${Date.now()}@talentgraph.test`,passwordHash,role:'recruiter'});recruiterId=recruiter.id;
    await User.create({name:'Other Recruiter',email:`other-${Date.now()}@talentgraph.test`,passwordHash,role:'recruiter'});
    await Company.create({name:'Northwind Studio',normalizedName:'northwind-studio',recruiterOwners:[recruiter._id]});
    server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Could not start test API');base=`http://127.0.0.1:${address.port}/api/v1`;
    const login=async(email:string)=>{const response=await fetch(`${base}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://localhost:5173'},body:JSON.stringify({email,password:'integration-test-password'})});expect(response.status).toBe(200);return response.headers.get('set-cookie')!.split(';')[0]};
    const users=await User.find({role:'recruiter'}).sort({createdAt:1});cookie=await login(users[0].email);otherCookie=await login(users[1].email);
  });
  afterAll(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await mongoose.connection.dropDatabase();await mongoose.disconnect()});
  it('creates a draft, publishes it to discovery, edits it, closes it, and preserves state across requests',async()=>{
    const companyProfile=await (await fetch(`${base}/recruiter/company`,{headers:headers()})).json() as {data:{company:{name:string};canEditCompany:boolean}};expect(companyProfile.data.company.name).toBe('Northwind Studio');expect(companyProfile.data.canEditCompany).toBe(true);
    const invalidSalary=await fetch(`${base}/recruiter/jobs`,{method:'POST',headers:headers(),body:JSON.stringify({...validJob,salary:{min:160000,max:100000,currency:'USD'},publish:false})});expect(invalidSalary.status).toBe(400);
    const invalidExperience=await fetch(`${base}/recruiter/jobs`,{method:'POST',headers:headers(),body:JSON.stringify({...validJob,minExperience:12,maxExperience:4,publish:false})});expect(invalidExperience.status).toBe(400);
    const pastPublish=await fetch(`${base}/recruiter/jobs`,{method:'POST',headers:headers(),body:JSON.stringify({...validJob,deadline:new Date(Date.now()-60000).toISOString(),publish:true})});expect(pastPublish.status).toBe(400);
    const draft={...validJob,deadline:undefined,requiredSkills:[{name:'NodeJS'},{name:'Product strategy'}],publish:false};const create=await fetch(`${base}/recruiter/jobs`,{method:'POST',headers:headers(),body:JSON.stringify(draft)});expect(create.status).toBe(201);const created=await create.json() as {data:{_id:string;status:string;deadline?:string}};jobId=created.data._id;expect(created.data.status).toBe('draft');expect(created.data.deadline).toBeUndefined();
    let list=await (await fetch(`${base}/recruiter/jobs`,{headers:headers()})).json() as {data:{data:{_id:string;title:string;status:string;responsibilities:string[];requiredSkills:{name:string}[];deadline?:string}[];summary:{total:number;published:number;drafts:number;closed:number};pagination:{total:number}}};expect(list.data.summary.total).toBe(1);expect(list.data.summary.drafts).toBe(1);expect(list.data.data[0]._id).toBe(jobId);
    const missingDeadline=await fetch(`${base}/recruiter/jobs/${jobId}/status`,{method:'PATCH',headers:headers(),body:JSON.stringify({status:'published'})});expect(missingDeadline.status).toBe(400);
    const offsetDeadline=new Date(Date.now()+30*86400000).toISOString().replace('Z','+05:30');const addDeadline=await fetch(`${base}/recruiter/jobs/${jobId}`,{method:'PUT',headers:headers(),body:JSON.stringify({...validJob,deadline:offsetDeadline,requiredSkills:[{name:'NodeJS'},{name:'Product strategy'}]})});expect(addDeadline.status).toBe(200);const deadlineSaved=await addDeadline.json() as {data:{deadline:string;requiredSkills:{name:string}[];responsibilities:string[]}};expect(Date.parse(deadlineSaved.data.deadline)).toBe(Date.parse(offsetDeadline));expect(deadlineSaved.data.requiredSkills[0].name).toBe('node.js');expect(deadlineSaved.data.responsibilities).toEqual(validJob.responsibilities);
    const publish=await fetch(`${base}/recruiter/jobs/${jobId}/status`,{method:'PATCH',headers:headers(),body:JSON.stringify({status:'published'})});expect(publish.status).toBe(200);
    const publicJobs=await (await fetch(`${base}/jobs?q=Senior%20Product%20Designer`)).json() as {data:{_id:string;title:string}[]};expect(publicJobs.data.some(j=>j._id===jobId)).toBe(true);
    const invalidEdit=await fetch(`${base}/recruiter/jobs/${jobId}`,{method:'PUT',headers:headers(),body:JSON.stringify({...validJob,title:'Lead Product Designer',salary:{min:-1,max:100000,currency:'USD'}})});expect(invalidEdit.status).toBe(400);
    const edit=await fetch(`${base}/recruiter/jobs/${jobId}`,{method:'PUT',headers:headers(),body:JSON.stringify({...validJob,title:'Lead Product Designer',deadline:offsetDeadline,requiredSkills:[{name:'NodeJS'},{name:'Product strategy'}]})});expect(edit.status).toBe(200);
    const close=await fetch(`${base}/recruiter/jobs/${jobId}/status`,{method:'PATCH',headers:headers(),body:JSON.stringify({status:'closed'})});expect(close.status).toBe(200);
    list=await (await fetch(`${base}/recruiter/jobs?status=closed`,{headers:headers()})).json() as typeof list;expect(list.data.data[0].title).toBe('Lead Product Designer');expect(list.data.data[0].status).toBe('closed');expect(list.data.summary.published).toBe(0);expect(list.data.summary.closed).toBe(1);expect(list.data.data[0].responsibilities).toEqual(validJob.responsibilities);expect(list.data.data[0].requiredSkills[0].name).toBe('node.js');expect(Date.parse(list.data.data[0].deadline!)).toBe(Date.parse(offsetDeadline));
    const noLongerPublic=await (await fetch(`${base}/jobs?q=Lead%20Product%20Designer`)).json() as {data:{_id:string}[]};expect(noLongerPublic.data.some(j=>j._id===jobId)).toBe(false);
  });
  it('rejects another recruiter from editing or changing the job status',async()=>{
    expect(recruiterId).toBeTruthy();const edit=await fetch(`${base}/recruiter/jobs/${jobId}`,{method:'PUT',headers:{...headers(),Cookie:otherCookie},body:JSON.stringify(validJob)});expect(edit.status).toBe(404);
    const status=await fetch(`${base}/recruiter/jobs/${jobId}/status`,{method:'PATCH',headers:{...headers(),Cookie:otherCookie},body:JSON.stringify({status:'published'})});expect(status.status).toBe(404);
  });
});
