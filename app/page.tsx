"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";
type RequestState = "pending" | "confirmed" | "rejected";
type Teacher = { id: string; name: string; capacity: number; occupied: number; forced?: number };
type SelectionRequest = { id: string; from: string; to: string; subject: string; state: RequestState; direction: "student" | "teacher" };

const initialTeachers: Teacher[] = [
  { id: "gushenming", name: "顾沈明", capacity: 40, occupied: 31 }, { id: "chenrongpin", name: "陈荣品", capacity: 40, occupied: 39 },
  { id: "guanlinting", name: "管林挺", capacity: 40, occupied: 23 }, { id: "jiangyoufu", name: "江有福", capacity: 40, occupied: 38 },
  { id: "tanxiaoqiu", name: "谭小球", capacity: 40, occupied: 16 }, { id: "wuyuanhong", name: "吴远红", capacity: 40, occupied: 27 },
  { id: "yeqihong", name: "叶其宏", capacity: 40, occupied: 24 }, { id: "zhangjianke", name: "张建科", capacity: 40, occupied: 40 },
  { id: "bizhenbo", name: "毕振波", capacity: 40, occupied: 12 }, { id: "wangguangwei", name: "王广伟", capacity: 40, occupied: 34 },
  { id: "qichangsong", name: "亓常松", capacity: 40, occupied: 29 }, { id: "houzhiling", name: "候志凌", capacity: 40, occupied: 19 },
  { id: "huanghaifeng", name: "黄海锋", capacity: 40, occupied: 36 }, { id: "zhengchan", name: "郑婵", capacity: 39, occupied: 17 },
  { id: "wangdandan", name: "王丹丹", capacity: 39, occupied: 22 }, { id: "wenchengyuan", name: "温程远", capacity: 39, occupied: 30 },
  { id: "liuzhonghua", name: "刘中华", capacity: 39, occupied: 33 }, { id: "jianglinfu", name: "蒋林甫", capacity: 39, occupied: 14 },
  { id: "fanchao", name: "樊超", capacity: 39, occupied: 26 }, { id: "chenjunhao", name: "陈俊皓", capacity: 39, occupied: 21 },
  { id: "moyunhua", name: "莫云华", capacity: 39, occupied: 19 }, { id: "liurui", name: "刘蕊", capacity: 39, occupied: 28 },
  { id: "lihui", name: "李慧", capacity: 39, occupied: 35 }, { id: "zhaoqiang", name: "赵强", capacity: 39, occupied: 11 },
  { id: "liwei", name: "李伟", capacity: 39, occupied: 25 },
];
const initialRequests: SelectionRequest[] = [
  { id: "r-001", from: "章均洋", to: "顾沈明", subject: "毕业论文双选", state: "pending", direction: "student" },
  { id: "r-002", from: "陈荣品", to: "赵思涵", subject: "毕业论文双选", state: "pending", direction: "teacher" },
];
// Confirmed from the 2026 undergraduate-advisor filing sheet: A23 has 91 and Z25 has 72.
// Eligibility must come from the imported roster, never from the first four digits of an ID number.
const thesisStudents = 163;
const totalTeachers = 25;

function Badge({ state }: { state: RequestState }) {
  const labels = { pending: "等待确认", confirmed: "已确认", rejected: "已拒绝" };
  return <span className={`badge badge-${state}`}>{labels[state]}</span>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("student");
  const [teachers, setTeachers] = useState(initialTeachers);
  const [requests, setRequests] = useState(initialRequests);
  const [notice, setNotice] = useState("当前为演示界面；正式上线后显示真实、同步的数据。");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [newTeacher, setNewTeacher] = useState("");
  const [forceValues, setForceValues] = useState<Record<string, string>>({});
  const capacityReady = thesisStudents !== null;
  const thesisTotal = thesisStudents ?? 0;
  const forcedTotal = teachers.reduce((sum, teacher) => sum + (teacher.forced ?? 0), 0);
  const flexibleTeachers = teachers.filter((teacher) => teacher.forced === undefined);
  const remaining = capacityReady ? Math.max(0, thesisTotal - forcedTotal) : 0;
  const baseCapacity = flexibleTeachers.length ? Math.floor(remaining / flexibleTeachers.length) : 0;
  const remainder = flexibleTeachers.length ? remaining % flexibleTeachers.length : 0;
  const displayedTeachers = useMemo(() => teachers.map((teacher) => {
    if (!capacityReady) return teacher;
    if (teacher.forced !== undefined) return teacher;
    const flexibleIndex = flexibleTeachers.findIndex((item) => item.id === teacher.id);
    const capacity = baseCapacity + (flexibleIndex >= 0 && flexibleIndex < remainder ? 1 : 0);
    return { ...teacher, capacity, occupied: Math.min(teacher.occupied, capacity) };
  }), [teachers, flexibleTeachers, baseCapacity, remainder, capacityReady]);
  const activeRequest = requests.find((request) => request.from === "章均洋" && request.state !== "rejected");

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity.trim() || !password.trim()) return setNotice("请填写学号/工号和密码。");
    setSignedIn(true); setNotice("演示登录成功。正式系统会以学号或工号验证身份。");
  }
  function applyToTeacher(teacher: Teacher) {
    if (activeRequest) return setNotice("你已有一条未结束的双选申请；请等待对方确认或拒绝后再操作。");
    if (teacher.occupied >= teacher.capacity) return setNotice(`${teacher.name}的名额已满，暂时不能申请。`);
    setTeachers((all) => all.map((item) => item.id === teacher.id ? { ...item, occupied: item.occupied + 1 } : item));
    setRequests((all) => [...all, { id: `r-${Date.now()}`, from: "章均洋", to: teacher.name, subject: "毕业论文双选", state: "pending", direction: "student" }]);
    setNotice(`已向${teacher.name}发送申请，并为你暂占一个名额。`);
  }
  function decideRequest(id: string, decision: "confirmed" | "rejected") {
    const request = requests.find((item) => item.id === id); if (!request) return;
    setRequests((all) => all.map((item) => item.id === id ? { ...item, state: decision } : item));
    if (decision === "rejected" && request.direction === "student") setTeachers((all) => all.map((teacher) => teacher.name === request.to ? { ...teacher, occupied: Math.max(0, teacher.occupied - 1) } : teacher));
    setNotice(decision === "confirmed" ? "已确认双选关系，双方在个人页面都能看到结果。" : "已拒绝申请，相应名额已经释放。");
  }
  function saveForcedCapacity(teacher: Teacher) {
    const raw = forceValues[teacher.id];
    if (raw === undefined || raw === "") { setTeachers((all) => all.map((item) => item.id === teacher.id ? { ...item, forced: undefined } : item)); return setNotice(`已取消${teacher.name}的强制名额，其他老师会自动重新均分。`); }
    if (!capacityReady) return setNotice("请先导入并确认 A23、Z25 名单，再设置强制名额。");
    const forced = Number(raw); if (!Number.isInteger(forced) || forced < 0 || forced > thesisTotal) return setNotice("强制名额必须是0到毕业论文学生总数之间的整数。");
    setTeachers((all) => all.map((item) => item.id === teacher.id ? { ...item, forced, capacity: forced } : item)); setNotice(`已将${teacher.name}设置为强制${forced}人；其余名额已自动重算。`);
  }
  function addTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = newTeacher.trim(); if (!name) return;
    if (teachers.some((teacher) => teacher.name === name)) return setNotice("该教师已在名单中。");
    setTeachers((all) => [...all, { id: `teacher-${Date.now()}`, name, capacity: 0, occupied: 0 }]); setNewTeacher(""); setNotice(`已加入${name}，毕业论文名额已按新人数自动均分。`);
  }
  function removeTeacher(teacher: Teacher) {
    if (teacher.occupied > 0) return setNotice(`${teacher.name}仍有${teacher.occupied}个占用名额，不能直接删除。请先处理其待确认或已确认的双选。`);
    setTeachers((all) => all.filter((item) => item.id !== teacher.id)); setNotice(`已删除${teacher.name}，其余老师的名额已自动重算。`);
  }

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="双选中心首页"><span className="brand-mark">选</span><span>毕业论文双选中心</span></a><div className="topbar-meta"><span className="live-dot" /> 数据同步中 <span className="divider" /> 2026届</div></header>
    <section className="hero" id="top"><div><p className="eyebrow">论文指导 · 双向确认</p><h1>双选关系，要由双方确认。</h1><p className="lead">学生和教师均可发起申请；系统会锁定待确认名额，避免超额或重复选择。</p></div><div className="hero-stat"><strong>{capacityReady ? thesisTotal : "待导入"}</strong><span>A23、Z25 毕业论文名单</span><small>{totalTeachers} 名教师参与均分</small></div></section>
    <nav className="role-switch" aria-label="身份切换">{(["student", "teacher", "admin"] as Role[]).map((item) => <button className={role === item ? "selected" : ""} key={item} onClick={() => setRole(item)}>{item === "student" ? "学生入口" : item === "teacher" ? "教师入口" : "管理员"}</button>)}</nav>
    <p className="notice" role="status">{notice}</p>
    {role === "student" && <section className="layout">
      <aside className="profile-card"><div className="avatar">章</div><p className="muted">学生账户</p><h2>章均洋</h2><p>2023210109108 · A23</p><div className="rule-box">每位学生仅能保留一条待确认或已确认的双选关系。</div>{!signedIn && <form onSubmit={login} className="login-form"><label>学号<input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="请输入学号" /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="初始密码" /></label><button type="submit" className="primary">登录演示</button></form>}</aside>
      <div><div className="section-heading"><div><p className="eyebrow">选择导师</p><h2>可申请的教师</h2></div><span>{displayedTeachers.filter((teacher) => teacher.occupied < teacher.capacity).length} 位尚有名额</span></div><div className="teacher-grid">{displayedTeachers.map((teacher) => { const left = Math.max(0, teacher.capacity - teacher.occupied); return <article className="teacher-card" key={teacher.id}><div><div className="mini-avatar">{teacher.name.slice(0, 1)}</div><h3>{teacher.name}</h3><p>{teacher.forced !== undefined ? "强制容量" : "自动均分容量"}</p></div><div className="capacity"><strong>{left}</strong><span>/ {teacher.capacity} 个可用</span></div><div className="meter"><i style={{ width: `${teacher.capacity ? (teacher.occupied / teacher.capacity) * 100 : 0}%` }} /></div><button className="secondary" disabled={Boolean(activeRequest) || left === 0} onClick={() => applyToTeacher(teacher)}>{left === 0 ? "名额已满" : activeRequest ? "已有申请" : "申请该教师"}</button></article>; })}</div></div>
      <aside className="inbox"><p className="eyebrow">我的进度</p><h2>双选申请</h2>{requests.filter((request) => request.from === "章均洋").map((request) => <div className="request" key={request.id}><Badge state={request.state} /><strong>{request.to}</strong><p>{request.state === "pending" ? "对方尚未处理；名额已为你保留。" : request.state === "confirmed" ? "双方确认完成。" : "该申请已被拒绝，可以重新选择。"}</p></div>)}</aside>
    </section>}
    {role === "teacher" && <section className="teacher-workspace"><div className="section-heading"><div><p className="eyebrow">教师工作台</p><h2>待你确认的申请</h2></div><span>顾沈明 · 剩余 9 个名额</span></div><div className="request-list">{requests.filter((request) => request.to === "顾沈明" && request.state === "pending").map((request) => <article className="request-row" key={request.id}><div className="avatar small">{request.from.slice(0, 1)}</div><div><h3>{request.from}</h3><p>{request.subject} · 由学生发起</p></div><Badge state={request.state} /><div className="actions"><button className="secondary" onClick={() => decideRequest(request.id, "rejected")}>拒绝</button><button className="primary" onClick={() => decideRequest(request.id, "confirmed")}>确认接收</button></div></article>)}<div className="teacher-apply"><h3>主动选择学生</h3><p>正式系统中可检索未被其他教师锁定的学生；学生收到后可确认或拒绝。</p><button className="secondary" onClick={() => setNotice("演示：系统将只展示没有待处理申请、且尚未确认导师的学生。")}>查看可选学生</button></div></div></section>}
    {role === "admin" && <section className="admin-workspace"><div className="section-heading"><div><p className="eyebrow">管理员控制台</p><h2>教师与容量配置</h2></div><span>{teachers.length} 位在职教师 · {capacityReady ? `${forcedTotal} 个强制名额` : "毕业论文名单待导入"}</span></div><div className="allocation-note">{capacityReady ? <><strong>自动分配规则：</strong>先扣除强制名额，再将剩余 {remaining} 个毕业论文名额均分给 {flexibleTeachers.length} 位未强制设定的教师。当前基准为每人 {baseCapacity} 个，前 {remainder} 位各加 1 个。</> : <><strong>需要先导入：</strong>请仅标记已经确认的 A23、Z25 学号；系统会以这份名单实时计算容量，绝不按学号年份猜测。</>}</div><form className="add-teacher" onSubmit={addTeacher}><label>新增教师<input value={newTeacher} onChange={(event) => setNewTeacher(event.target.value)} placeholder="填写教师姓名" /></label><button className="primary" type="submit">添加并重算</button></form><div className="admin-table"><div className="table-head"><span>教师</span><span>已占用</span><span>最终容量</span><span>强制名额</span><span>操作</span></div>{displayedTeachers.map((teacher) => <div className="table-row" key={teacher.id}><strong>{teacher.name}</strong><span>{teacher.occupied}</span><span>{capacityReady ? teacher.capacity : "待计算"}</span><label className="compact-input"><input type="number" min="0" value={forceValues[teacher.id] ?? (teacher.forced ?? "")} onChange={(event) => setForceValues((all) => ({ ...all, [teacher.id]: event.target.value }))} placeholder="自动" /><button onClick={() => saveForcedCapacity(teacher)}>保存</button></label><button className="text-button" onClick={() => removeTeacher(teacher)}>删除</button></div>)}</div></section>}
    <footer>毕业论文双选中心 · 管理员可随时查看、导出和重置数据</footer>
  </main>;
}
