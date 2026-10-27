import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Profile, Company, Job, Application, SavedJob, Interview } from '../models.js';

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/talentgraph';
const skills = ['TypeScript','React','Node.js','MongoDB','Product design','Python','AWS','SQL','Figma','Data analysis','Java','Docker'];

async function main() {
  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash('TalentGraphDemo2026!', 12);
  const accounts = [
    { name: 'Taylor Candidate', email: 'candidate@talentgraph.local', role: 'candidate' },
    { name: 'Riley Recruiter', email: 'recruiter@talentgraph.local', role: 'recruiter' },
    { name: 'Avery Admin', email: 'admin@talentgraph.local', role: 'admin' },
  ];
  for (const account of accounts) await User.updateOne({ email: account.email }, { $setOnInsert: { ...account, passwordHash, emailVerified: true, accountStatus: 'active' } }, { upsert: true });
  const recruiter = await User.findOne({ email: accounts[1].email });
  if (!recruiter) throw new Error('Could not initialize recruiter');

  const companyNames = ['Northstar Labs','Cedar & Co','Orbit Systems','Brightpath Health','Fieldnote','Mosaic Finance'];
  const companies = [];
  for (const name of companyNames) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    companies.push(await Company.findOneAndUpdate({ normalizedName }, { $setOnInsert: { name, normalizedName, industry: 'Technology', verified: true, recruiterOwners: [recruiter._id] } }, { upsert: true, new: true }));
  }

  const people = [];
  for (let i = 0; i < 30; i++) {
    const email = `candidate${String(i + 1).padStart(2, '0')}@talentgraph.local`;
    const user = await User.findOneAndUpdate({ email }, { $setOnInsert: { name: `${['Jordan Lee','Sam Patel','Morgan Chen','Casey Kim','Jamie Rivera'][i % 5]} ${i + 1}`, email, passwordHash, role: 'candidate', emailVerified: true } }, { upsert: true, new: true });
    people.push(user);
    const selection = [skills[i % skills.length], skills[(i + 3) % skills.length], skills[(i + 6) % skills.length]];
    await Profile.updateOne({ userId: user._id }, {
      $set: { headline: ['Software Engineer','Product Designer','Data Analyst'][i % 3], summary: 'Experienced professional who enjoys solving practical customer problems.', experienceYears: i % 12, location: { city: ['Toronto','Austin','London','Bengaluru'][i % 4], country: ['Canada','United States','United Kingdom','India'][i % 4] }, currentPosition: ['Engineer','Designer','Analyst'][i % 3], preferredRoles: ['Software Engineer','Product Designer','Data Analyst'], skills: selection.map(name => ({ name, category: 'Technology', proficiency: 'advanced' })), profileVisibility: 'recruiters', profileCompleteness: 80 },
      $setOnInsert: { userId: user._id },
    }, { upsert: true });
  }

  const titles = ['Senior Product Designer','Full Stack Engineer','Data Analyst','Backend Engineer','Product Manager','Frontend Developer','UX Researcher','DevOps Engineer','Machine Learning Engineer','Technical Recruiter','Mobile Engineer','Growth Analyst'];
  const jobs = [];
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const normalizedTitle = title.toLowerCase();
    const job = await Job.findOneAndUpdate({ recruiterId: recruiter._id, normalizedTitle }, { $setOnInsert: {
      title, normalizedTitle, description: `Join a collaborative team as our ${title}. Build thoughtful products and partner across the organization to deliver meaningful outcomes.`, responsibilities: ['Partner with a cross-functional team','Build and improve customer experiences'], requiredSkills: [{ name: skills[i % skills.length] }, { name: skills[(i + 3) % skills.length] }], preferredSkills: [{ name: skills[(i + 5) % skills.length] }], minExperience: i % 6, maxExperience: 12, location: { city: 'Austin', country: 'United States' }, workMode: i % 3 === 0 ? 'remote' : 'hybrid', employmentType: 'full-time', salary: { min: 85000, max: 145000, currency: 'USD' }, companyId: companies[i % companies.length]._id, recruiterId: recruiter._id, status: 'published', deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
    } }, { upsert: true, new: true });
    jobs.push(job);
  }

  const stages = ['applied','screening','shortlisted','interview','offer','rejected'];
  for (let i = 0; i < 60; i++) {
    const candidate = people[i % people.length], job = jobs[i % jobs.length], createdAt = new Date(Date.now() - i * 86400000);
    await Application.updateOne({ jobId: job._id, candidateId: candidate._id }, { $setOnInsert: { jobId: job._id, candidateId: candidate._id, status: stages[i % stages.length], matchScore: 55 + (i * 7) % 45, profileSnapshot: { headline: 'Experienced professional', experienceYears: i % 12, skills: [{ name: skills[i % skills.length] }] }, statusHistory: [{ to: stages[i % stages.length], actor: recruiter._id, at: createdAt }], createdAt, updatedAt: createdAt } }, { upsert: true });
    if (i < 10) await SavedJob.updateOne({ candidateId: candidate._id, jobId: jobs[(i + 2) % jobs.length]._id }, { $setOnInsert: { candidateId: candidate._id, jobId: jobs[(i + 2) % jobs.length]._id } }, { upsert: true });
  }
  const firstApp = await Application.findOne();
  if (firstApp) await Interview.updateOne({ applicationId: firstApp._id }, { $setOnInsert: { applicationId: firstApp._id, startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 90000000), mode: 'video', status: 'scheduled', participants: [recruiter._id] } }, { upsert: true });
  console.log('Seed complete. Demo accounts: candidate@talentgraph.local, recruiter@talentgraph.local, admin@talentgraph.local — password: TalentGraphDemo2026!');
  await mongoose.disconnect();
}
main().catch(error => { console.error(error); process.exit(1); });
