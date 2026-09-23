/* Private local provisioning only. Do not commit roster files or the service-role key.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ADMIN_PASSWORD=... node scripts/import-roster.mjs C:\path\roster.txt C:\path\thesis-groups.tsv 123456

thesis-groups.tsv must contain exactly two tab-separated columns per line:
student_id<TAB>A23 or Z25
Only IDs in this separate, confirmed list are counted as thesis students. */
import { readFile } from "node:fs/promises";
const [filePath, groupPath, initialPassword] = process.argv.slice(2);
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!filePath || !groupPath || !initialPassword || !url || !serviceKey || !adminPassword) throw new Error("缺少名单文件、A23/Z25分组文件、初始密码、管理员密码或 Supabase 配置。");
const text = await readFile(filePath, "utf8");
const groupText = await readFile(groupPath, "utf8");
const thesisGroups = new Map([...groupText.matchAll(/^(\d+)\t(A23|Z25)$/gm)].map((match) => [match[1], match[2]]));
if (thesisGroups.size === 0) throw new Error("A23/Z25 分组文件为空或格式不正确。");
const students = [...text.matchAll(/^(\d+)\t(.+)\t(\d+)$/gm)].map((match) => {
  const cohort = thesisGroups.get(match[3]);
  return { full_name: match[2].trim(), identity_no: match[3], role: "student", cohort: cohort ?? "未分组", is_thesis_student: Boolean(cohort) };
});
const teacherNames = ["顾沈明","陈荣品","管林挺","江有福","谭小球","吴远红","叶其宏","张建科","毕振波","王广伟","亓常松","候志凌","黄海锋","郑婵","王丹丹","温程远","刘中华","蒋林甫","樊超","陈俊皓","莫云华","刘蕊","李慧","赵强","李伟"];
const teachers = teacherNames.map((full_name, index) => ({ full_name, identity_no: `T${String(index + 1).padStart(3, "0")}`, role: "teacher", cohort: null, is_thesis_student: false }));
const admin = { full_name: "系统管理员", identity_no: "ADMIN0505", role: "admin", cohort: null, is_thesis_student: false };
async function post(path, body) { const response = await fetch(`${url}${path}`, { method:"POST", headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"return=representation"}, body:JSON.stringify(body) }); if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`); return response.json(); }
async function patch(path, body) { const response = await fetch(`${url}${path}`, { method:"PATCH", headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"}, body:JSON.stringify(body) }); if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`); }
const teacherAccounts = [];
for (const record of [...students, ...teachers, admin]) { const email = `${record.identity_no.toLowerCase()}@selection.local`; const account = await post("/auth/v1/admin/users", { email, password:record.role === "admin" ? adminPassword : initialPassword, email_confirm:true, user_metadata:{identity_no:record.identity_no} }); await post("/rest/v1/profiles", { id:account.id, ...record, active:true, must_change_password:record.role !== "admin" }); if (record.role === "teacher") { teacherAccounts.push({ id:account.id, name:record.full_name }); await post("/rest/v1/teachers", { profile_id:account.id, active:true }); } }
const sortedTeachers = teacherAccounts.sort((a,b) => a.name.localeCompare(b.name, "zh-CN"));
const baseCapacity = Math.floor(thesisGroups.size / sortedTeachers.length), extraCapacity = thesisGroups.size % sortedTeachers.length;
await Promise.all(sortedTeachers.map((teacher, index) => patch(`/rest/v1/teachers?profile_id=eq.${teacher.id}`, { calculated_capacity:baseCapacity + (index < extraCapacity ? 1 : 0) })));
const a23 = [...thesisGroups.values()].filter((group) => group === "A23").length;
const z25 = [...thesisGroups.values()].filter((group) => group === "Z25").length;
console.log(`已建立 ${students.length} 个学生账户、${teachers.length} 个教师账户；毕业论文名单：A23 ${a23} 人、Z25 ${z25} 人。请以管理员账户调用重算容量。`);
