(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  const state = {
    screen: "splash", // splash | lab
    step: 0,
    done: {},
    score: 0,
    maxScore: 0,
    startedAt: null,
    tick: 0,
    toast: null,
    azureAuthed: false,
    loginPhase: "user",
    loginUser: "",
    loginPass: "",
    loginError: "",
    searchQ: "",
    searchOpen: false,
    portalView: "home", // home | migrate | discover | discovered | assess | replicate | test | migratevm | vm
    showCreate: false,
    rgMode: "new",
    form: {
      rg: "rg-migrate-prod",
      project: "contoso-vmware-migrate",
      geo: "Asia",
      sub: LAB.creds.subscription,
    },
    projectCreated: false,
    projectDeploying: false,
    discoverOpen: false,
    applianceName: "contosoappl01",
    keyGenPhase: "form", // form | creating | ready
    projectKey: "",
    ovaDownloaded: false,
    vcAuthed: false,
    vcLoginU: "",
    vcLoginP: "",
    vcError: "",
    ovfStep: 0,
    ovf: {
      source: "AzureMigrateAppliance.ova",
      name: "AzureMigrateAppl",
      folder: "Contoso-DC1 / Migrate",
      compute: "Prod-Cluster",
      storage: "vsanDatastore",
      disk: "Thick Provision Lazy Zeroed",
      network: "VM-Network",
    },
    ovfDeployed: false,
    poweredOn: false,
    applTab: "prereq",
    checks: { net: "idle", time: "idle", urls: "idle" },
    keyInput: "",
    keyAccepted: false,
    updating: false,
    updated: false,
    deviceCode: "C7X2-9MPL",
    aadPhase: "idle",
    registered: false,
    vddk: false,
    credName: "vcenter-prod",
    credUser: "",
    credPass: "",
    credsSaved: false,
    srcFqdn: "vcenter.contoso.local",
    srcPort: "443",
    srcSaved: false,
    discovering: false,
    discovered: false,
    discProgress: 0,
    selectedVm: null,
    assessOpen: false,
    assessName: "Assess-Contoso-Wave1",
    groupName: "Wave1-VMware",
    assessTarget: "East US",
    assessSizing: "Performance-based",
    selectedForAssess: { web01: true, app01: true, sql01: true, lnx01: true },
    assessmentReady: false,
    assessView: false,
    replOpen: false,
    replPhase: "source",
    replVm: { web01: true, app01: false, sql01: false, lnx01: false },
    replRg: "rg-migrate-prod",
    replRegion: "East US",
    replVnet: "vnet-landing-eus",
    replSubnet: "snet-web",
    replSku: "Standard_D4s_v5",
    hybrid: true,
    replicating: false,
    replPct: 0,
    protected: false,
    testOpen: false,
    testVnet: "vnet-test-eus",
    testing: false,
    testPct: 0,
    testRunning: false,
    testCleaned: false,
    cutOpen: false,
    shutdown: "yes",
    migrating: false,
    migPct: 0,
    migrated: false,
    stoppedRep: false,
    quizSel: {},
    quizSubmitted: false,
    quizScore: 0,
    showHint: true,
  };

  function toast(msg, kind = "") {
    state.toast = { msg, kind };
    render();
    setTimeout(() => {
      state.toast = null;
      render();
    }, 2600);
  }

  function award(pts, why) {
    state.score += pts;
    state.maxScore = Math.max(state.maxScore, state.score);
    if (why) toast(`+${pts} XP · ${why}`, "ok");
  }

  function mark(taskId, pts = 15) {
    const key = `${STEPS[state.step].id}:${taskId}`;
    if (state.done[key]) return;
    state.done[key] = true;
    award(pts, STEPS[state.step].tasks.find((t) => t.id === taskId)?.text || "Task complete");
    maybeUnlock();
    render();
  }

  function isDone(stepId, taskId) {
    return !!state.done[`${stepId}:${taskId}`];
  }

  function stepComplete(i) {
    return STEPS[i].tasks.every((t) => state.done[`${STEPS[i].id}:${t.id}`]);
  }

  function highestUnlocked() {
    let u = 0;
    for (let i = 0; i < STEPS.length; i++) {
      if (i === 0 || stepComplete(i - 1)) u = i;
      else break;
    }
    return u;
  }

  function maybeUnlock() {
    if (stepComplete(state.step) && state.step < STEPS.length - 1) {
      // stay; user advances
    }
  }

  function goStep(i) {
    if (i > highestUnlocked()) {
      toast("Complete the current module before unlocking this one.", "err");
      return;
    }
    state.step = i;
    const s = STEPS[i];
    if (s.sim === "portal") {
      if (!state.azureAuthed) state.portalView = "login";
      else if (s.id === "create-project") state.portalView = state.projectCreated ? "migrate" : "home";
      else if (s.id === "discover-key") state.portalView = "migrate";
      else if (s.id === "review-disc") state.portalView = "discovered";
      else if (s.id === "assess") state.portalView = "assess";
      else if (s.id === "replicate") state.portalView = "replicate";
      else if (s.id === "test-mig") state.portalView = "replicate";
      else if (s.id === "cutover") state.portalView = "replicate";
      else state.portalView = "home";
    }
    if (s.id === "review-disc" && state.discovered) {
      const key = "review-disc:see-vms";
      if (!state.done[key]) {
        state.done[key] = true;
        award(15, "4 VMware servers discovered");
      }
    }
    if (s.id === "complete") {
      const key = "complete:done";
      if (!state.done[key]) state.done[key] = true;
    }
    render();
  }

  function elapsed() {
    if (!state.startedAt) return "00:00";
    const s = Math.floor((Date.now() - state.startedAt) / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  }

  function generateKey(name) {
    const n = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
    const rand = "7K2Q9M4P1X8C3H6R";
    return `${n}@MIGRATE@${LAB.creds.subId.slice(0, 8)}@${LAB.creds.rgName}@${rand}`;
  }

  /* ---------- SPLASH ---------- */
  function renderSplash() {
    return `
      <div class="splash">
        <div class="splash-top">
          <div class="brand">
            <div class="brand-mark"><span>C</span></div>
            <div>Contoso Cloud Academy · Hands-on Lab</div>
          </div>
          <div class="splash-meta">
            <span>${LAB.duration}</span>
            <span>${LAB.level}</span>
            <span>${LAB.exam}</span>
          </div>
        </div>
        <div class="splash-hero">
          <div>
            <div class="kicker">Lab ${LAB.title.split("·")[0].trim()}</div>
            <h1>Create an Azure Migrate project and migrate a vCenter VM to Azure</h1>
            <p class="lede">An end-to-end simulator of the real workflow: portal project, OVA appliance on vSphere, Configuration Manager registration, continuous discovery, assessment, agentless replication, test migration, and planned cutover of <b>WEB-01</b>.</p>
            <div class="chip-row">
              <span class="chip">VMware vSphere 8</span>
              <span class="chip">Agentless CBT replication</span>
              <span class="chip">Azure Migrate appliance</span>
              <span class="chip">East US landing zone</span>
            </div>
            <div class="cta-row">
              <button class="btn btn-primary" id="btn-start">Start lab</button>
              <button class="btn btn-ghost" id="btn-guide">Open student guide</button>
            </div>
            <p class="lede" style="margin-top:18px;font-size:13px;color:#8aa0b8">No Azure subscription or vCenter is required. Every blade, wizard, and appliance check is simulated. Follow the coach panel on the right after you start.</p>
          </div>
          <div class="brief-card">
            <h3>Lab environment · Contoso datacenter</h3>
            ${envRow("Azure user", LAB.creds.azureUser)}
            ${envRow("Azure password", LAB.creds.azurePass)}
            ${envRow("Subscription", "Contoso-Prod")}
            ${envRow("vCenter", LAB.creds.vcenter + " (" + LAB.creds.vcenterIp + ")")}
            ${envRow("vCenter user", LAB.creds.vcenterUser)}
            ${envRow("vCenter password", LAB.creds.vcenterPass)}
            ${envRow("Appliance IP", LAB.creds.applianceIp + " :44368")}
            ${envRow("Required project", LAB.creds.projectName)}
            ${envRow("Required RG", LAB.creds.rgName)}
            ${envRow("Appliance name", LAB.creds.applianceName)}
            ${envRow("VM to migrate", "WEB-01 → Standard_D4s_v5")}
          </div>
        </div>
        <div class="modules">
          <h2>What you will perform</h2>
          <div class="mod-grid">
            ${[
              ["1", "Project", "Create the Azure Migrate project and resource group."],
              ["2", "Key + OVA", "Generate the project key and download the appliance."],
              ["3", "vCenter", "Deploy the OVA on Prod-Cluster."],
              ["4", "Register", "Config Manager, Entra login, VDDK."],
              ["5", "Discover", "Connect vCenter and inventory VMs."],
              ["6", "Assess", "Performance-based Azure VM assessment."],
              ["7", "Replicate", "Agentless replication of WEB-01."],
              ["8", "Test", "Test migrate into an isolated VNet."],
              ["9", "Cutover", "Planned migration with no data loss."],
              ["10", "Check", "Knowledge check and completion recap."],
            ]
              .map(
                ([n, t, d]) => `<div class="mod"><div class="n">${n}</div><h4>${t}</h4><p>${d}</p></div>`
              )
              .join("")}
          </div>
        </div>
      </div>`;
  }

  function envRow(k, v) {
    return `<div class="env-row"><b>${k}</b><span>${esc(v)}</span></div>`;
  }

  /* ---------- LAB SHELL ---------- */
  function renderLab() {
    const step = STEPS[state.step];
    const unlocked = highestUnlocked();
    return `
      <div class="lab">
        <div class="lab-bar">
          <div class="lab-bar-left">
            <div class="brand-mark" style="width:28px;height:28px;font-size:13px"><span> cons</span></div>
            <div class="lab-title">AZ-MIG-201 · vCenter to Azure
              <small>Contoso production landing zone · simulator</small>
            </div>
          </div>
          <div class="lab-bar-right">
            <div class="stat">Time <strong>${elapsed()}</strong></div>
            <div class="stat">Score <strong>${state.score}</strong></div>
            <div class="stat">Module <strong>${state.step + 1}/${STEPS.length}</strong></div>
            <button class="btn btn-ghost btn-sm" id="btn-brief">Briefing</button>
          </div>
        </div>
        <div class="workspace">
          <aside class="nav">
            <h3>Lab path</h3>
            ${STEPS.map((s, i) => {
              const locked = i > unlocked;
              const done = stepComplete(i);
              const cls = [
                "step",
                i === state.step ? "active" : "",
                locked ? "locked" : "",
                done ? "done" : "",
              ].join(" ");
              return `<button class="${cls}" data-step="${i}">
                <div class="dot">${done ? "✓" : i + 1}</div>
                <div><div class="st">${s.title}</div><div class="ss">${s.module} · ${s.short}</div></div>
              </button>`;
            }).join("")}
          </aside>
          <section class="canvas">
            <div class="sim-chrome">
              <div class="traffic"><i class="r"></i><i class="y"></i><i class="g"></i></div>
              <div class="urlbar">${step.url}</div>
              <span style="font-size:11px;color:#999">${step.sim === "portal" ? "Microsoft Azure" : step.sim === "vsphere" ? "vSphere Client" : step.sim === "appliance" ? "Appliance Configuration Manager" : "Lab"}</span>
            </div>
            <div class="sim-body" id="sim-body">${renderSim(step)}</div>
          </section>
          <aside class="coach">
            <div class="coach-head">
              <div class="tag">${step.module}</div>
              <h2>${step.title}</h2>
              <p>${step.objective}</p>
            </div>
            <div class="tasks">
              ${step.tasks
                .map((t) => {
                  const d = isDone(step.id, t.id);
                  return `<div class="task ${d ? "done" : ""}"><div class="box"></div><div>${t.text}</div></div>`;
                })
                .join("")}
            </div>
            <div class="hint"><strong>Hint.</strong> ${step.hint}</div>
            <div class="coach-actions">
              <button class="btn btn-primary" id="btn-next" ${stepComplete(state.step) && state.step < STEPS.length - 1 ? "" : "disabled"}>
                ${state.step === STEPS.length - 1 ? "Finished" : "Continue to next module"}
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-skip" ${state.step >= STEPS.length - 2 ? "disabled" : ""}>Instructor: complete this module</button>
            </div>
          </aside>
        </div>
      </div>
      ${state.toast ? `<div class="toast ${state.toast.kind}">${esc(state.toast.msg)}</div>` : ""}`;
  }

  function renderSim(step) {
    if (step.sim === "portal") return renderPortal();
    if (step.sim === "vsphere") return renderVsphere();
    if (step.sim === "appliance") return renderAppliance();
    if (step.sim === "quiz") return renderQuiz();
    if (step.sim === "complete") return renderComplete();
    return "";
  }

  /* ---------- PORTAL ---------- */
  function renderPortal() {
    if (!state.azureAuthed) return renderMsLogin();
    return `
      <div class="portal">
        <div class="az-top">
          <button class="az-hamb" title="menu">☰</button>
          <div class="az-logo">
            <svg width="20" height="20" viewBox="0 0 18 18"><path fill="#fff" d="M7.5 1.5 1 16.5h4.2l1.1-2.7h5.4l1.1 2.7H17L10.6 1.5H7.5zm.9 3.3 2 5.2H6.4l2-5.2z"/></svg>
            Microsoft Azure
          </div>
          <div class="az-search">
            <span style="margin-right:8px">⌕</span>
            <input id="az-search" placeholder="Search resources, services, and docs (G+/)" value="${esc(state.searchQ)}" />
          </div>
          <div class="az-right">
            <span>Contoso-Prod</span>
            <span>East US</span>
            <div class="az-avatar">AD</div>
          </div>
        </div>
        ${state.searchOpen ? renderSearchDd() : ""}
        <div class="az-shell">
          <div class="az-rail">
            <button title="Home" data-nav="home" class="${state.portalView === "home" ? "on" : ""}">⌂</button>
            <button title="Migrate" data-nav="migrate" class="${["migrate", "discover", "discovered", "assess", "replicate"].includes(state.portalView) ? "on" : ""}">↗</button>
            <button title="All resources">▦</button>
          </div>
          <div class="az-main">
            ${renderPortalMain()}
          </div>
        </div>
        ${state.showCreate ? renderCreateBlade() : ""}
        ${state.discoverOpen ? renderDiscoverBlade() : ""}
        ${state.assessOpen ? renderAssessBlade() : ""}
        ${state.replOpen ? renderReplBlade() : ""}
        ${state.testOpen ? renderTestBlade() : ""}
        ${state.cutOpen ? renderCutBlade() : ""}
      </div>`;
  }

  function renderMsLogin() {
    return `
      <div class="login-wrap">
        <div class="ms-login">
          <div style="font-size:22px;font-weight:700;color:#5e5e5e">Microsoft</div>
          ${
            state.loginPhase === "user"
              ? `
            <h2>Sign in</h2>
            <div class="form-row">
              <input id="login-user" type="text" placeholder="Email, phone, or Skype" value="${esc(state.loginUser)}" />
            </div>
            ${state.loginError ? `<div class="errbox mb8">${state.loginError}</div>` : ""}
            <button class="btn btn-primary" id="login-next">Next</button>
            <p class="muted mt12" style="font-size:12px">Lab account: ${LAB.creds.azureUser}</p>`
              : `
            <div class="muted" style="font-size:13px">${esc(state.loginUser)}</div>
            <h2>Enter password</h2>
            <div class="form-row">
              <input id="login-pass" type="password" placeholder="Password" value="${esc(state.loginPass)}" />
            </div>
            ${state.loginError ? `<div class="errbox mb8">${state.loginError}</div>` : ""}
            <button class="btn btn-primary" id="login-go">Sign in</button>`
          }
        </div>
      </div>`;
  }

  function renderSearchDd() {
    const q = state.searchQ.toLowerCase();
    const items = [
      { t: "Azure Migrate", d: "Discover, assess, and migrate servers, databases, and web apps", nav: "migrate" },
      { t: "Resource groups", d: "Create and manage resource groups", nav: "home" },
      { t: "Virtual machines", d: "Create and manage Azure virtual machines", nav: "vms" },
    ].filter((i) => !q || i.t.toLowerCase().includes(q) || i.d.toLowerCase().includes(q));
    return `<div class="search-dd">
      ${items
        .map(
          (i) => `<button data-goto="${i.nav}"><div><div class="t">${i.t}</div><div class="d">${i.d}</div></div></button>`
        )
        .join("") || `<div style="padding:12px;color:#605e5c;font-size:13px">No results</div>`}
    </div>`;
  }

  function renderPortalMain() {
    switch (state.portalView) {
      case "home":
        return renderHome();
      case "migrate":
        return renderMigrateHub();
      case "discovered":
        return renderDiscovered();
      case "assess":
        return renderAssessHub();
      case "replicate":
        return renderReplHub();
      case "vm":
        return renderVmBlade();
      case "azvm":
        return renderAzVm();
      default:
        return renderHome();
    }
  }

  function renderHome() {
    return `
      <div class="crumb">Home</div>
      <h1>Welcome to Azure</h1>
      <p class="sub">Signed in as ${LAB.creds.azureUser} · Directory ${LAB.creds.tenant}</p>
      <div class="grid-2">
        <div class="card">
          <div class="card-h">Azure services</div>
          <div class="card-b" style="display:flex;flex-wrap:wrap;gap:10px">
            ${svc("Azure Migrate", "↗", "migrate")}
            ${svc("Virtual machines", "▣", "azvm")}
            ${svc("Resource groups", "▦", "home")}
            ${svc("Virtual networks", "⎔", "home")}
          </div>
        </div>
        <div class="card">
          <div class="card-h">Navigate</div>
          <div class="card-b">
            <p style="font-size:13px;margin:0 0 10px">Search the top bar for <b>Azure Migrate</b> to create the project. This is how operators find the service in a real tenant.</p>
            <div class="note">Required project name: <span class="mono">${LAB.creds.projectName}</span> in resource group <span class="mono">${LAB.creds.rgName}</span>.</div>
          </div>
        </div>
      </div>`;
  }

  function svc(name, icon, nav) {
    return `<button class="btn btn-ghost" data-goto="${nav}" style="color:#323130;border-color:#d2d0ce;min-width:150px;justify-content:flex-start">
      <span>${icon}</span> ${name}
    </button>`;
  }

  function renderMigrateHub() {
    return `
      <div class="crumb">Azure Migrate</div>
      <h1>Azure Migrate</h1>
      <p class="sub">Discover, assess, and migrate on-premises servers, databases, and web apps to Azure.</p>
      ${
        !state.projectCreated
          ? `
        <div class="card">
          <div class="card-h">Get started</div>
          <div class="card-b">
            <p style="font-size:13px">Create a project to store discovery metadata and attach the Discovery and assessment + Migration and modernization tools.</p>
            <div class="warnbox mb8">Starting November 2025, creating a project requires Owner or Azure Migrate Owner on the subscription. Your lab account has Owner.</div>
            <button class="btn btn-primary" id="btn-create-proj">Create project</button>
          </div>
        </div>`
          : `
        <div class="okbox mb8">Project <b>${esc(state.form.project)}</b> is deployed in <b>${esc(state.form.rg)}</b> · geography ${esc(state.form.geo)} · tools ready.</div>
        <div class="grid-2">
          <div class="kpi"><div class="l">Discovered servers</div><div class="v az">${state.discovered ? 4 : 0}</div></div>
          <div class="kpi"><div class="l">Assessments</div><div class="v az">${state.assessmentReady ? 1 : 0}</div></div>
          <div class="kpi"><div class="l">Replicating / protected</div><div class="v az">${state.protected || state.replicating ? 1 : 0}</div></div>
          <div class="kpi"><div class="l">Migrated</div><div class="v az">${state.migrated ? 1 : 0}</div></div>
        </div>
        <div class="card mt16">
          <div class="card-h">Servers, databases and web apps</div>
          <div class="card-b">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div>
                <div style="font-weight:600">Azure Migrate: Discovery and assessment</div>
                <div class="muted" style="font-size:12px">Appliance ${state.registered ? LAB.creds.applianceName + " · Registered" : "Not registered"}</div>
              </div>
              <div class="flex">
                <button class="btn btn-primary btn-sm" id="btn-discover">Discover</button>
                <button class="btn btn-ghost btn-sm" id="btn-assess" style="color:#323130;border-color:#d2d0ce">Assess</button>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:600">Migration and modernization</div>
                <div class="muted" style="font-size:12px">${state.protected ? "WEB-01 Protected" : state.replicating ? "WEB-01 Initial replication" : "No replications"}</div>
              </div>
              <div class="flex">
                <button class="btn btn-primary btn-sm" id="btn-replicate">Replicate</button>
                <button class="btn btn-ghost btn-sm" id="btn-open-repl" style="color:#323130;border-color:#d2d0ce">Replicating servers</button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex mt16">
          <button class="btn btn-ghost btn-sm" id="btn-open-disc" style="color:#323130;border-color:#d2d0ce">Discovered servers</button>
          <button class="btn btn-ghost btn-sm" id="btn-open-assess" style="color:#323130;border-color:#d2d0ce">Assessments</button>
        </div>`
      }`;
  }

  function renderCreateBlade() {
    return `
      <div class="blade">
        <div class="blade-p">
          <div class="blade-h">
            <div class="crumb">Azure Migrate</div>
            <h2>Create project</h2>
          </div>
          <div class="blade-b">
            <div class="form-row">
              <label class="req">Subscription</label>
              <select id="f-sub"><option>${esc(LAB.creds.subscription)}</option></select>
            </div>
            <div class="form-row">
              <label class="req">Resource group</label>
              <div class="radio"><input type="radio" name="rgmode" value="new" ${state.rgMode === "new" ? "checked" : ""} /> Create new</div>
              <div class="radio"><input type="radio" name="rgmode" value="exist" ${state.rgMode === "exist" ? "checked" : ""} /> Use existing</div>
              <input id="f-rg" type="text" class="mt8" value="${esc(state.form.rg)}" placeholder="rg-migrate-prod" />
              <div class="help">Lab standard: rg-migrate-prod</div>
            </div>
            <div class="form-row">
              <label class="req">Project name</label>
              <input id="f-proj" type="text" value="${esc(state.form.project)}" />
            </div>
            <div class="form-row">
              <label class="req">Geography</label>
              <select id="f-geo">
                ${["Asia", "Europe", "United States", "Azure Government", "India", "United Kingdom"]
                  .map((g) => `<option ${state.form.geo === g ? "selected" : ""}>${g}</option>`)
                  .join("")}
              </select>
              <div class="help">Geography stores metadata only. You can assess/migrate to any supported target region.</div>
            </div>
            ${state.projectDeploying ? `<div class="note mt12"><span class="spin"></span> &nbsp; Deploying Microsoft.Migrate project and attached tools…</div>` : ""}
          </div>
          <div class="blade-f">
            <button class="btn btn-ghost" id="close-create" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
            <button class="btn btn-primary" id="do-create" ${state.projectDeploying ? "disabled" : ""}>Create</button>
          </div>
        </div>
      </div>`;
  }

  function renderDiscoverBlade() {
    return `
      <div class="blade">
        <div class="blade-p">
          <div class="blade-h">
            <div class="crumb">Azure Migrate: Discovery and assessment</div>
            <h2>Discover</h2>
          </div>
          <div class="blade-b">
            <div class="form-row">
              <label class="req">Are your machines virtualized?</label>
              <select id="disc-fab">
                <option value="vmware" selected>Yes, with VMware vSphere hypervisor</option>
                <option value="hv">Yes, with Hyper-V</option>
                <option value="phys">Physical or other (AWS/GCP/KVM)</option>
              </select>
            </div>
            <div class="form-row">
              <label>Discovery method</label>
              <div class="radio"><input type="radio" checked /> Azure Migrate appliance (recommended for VMware)</div>
              <div class="radio"><input type="radio" disabled /> Import with CSV / RVTools</div>
            </div>
            <div class="note mb8">Agentless replication uses this same appliance (plus VDDK). Nothing is installed in the guest OS.</div>
            <div class="form-row">
              <label class="req">1 · Appliance name</label>
              <input id="appl-name" type="text" maxlength="14" value="${esc(state.applianceName)}" />
              <div class="help">Alphanumeric, 14 characters or fewer. Lab value: contosoappl01</div>
            </div>
            ${
              state.keyGenPhase === "form"
                ? `<button class="btn btn-primary" id="gen-key">Generate key</button>`
                : state.keyGenPhase === "creating"
                ? `<div class="note"><span class="spin"></span> &nbsp; Creating Azure resources (Key Vault, storage, AAD app) for the appliance… Do not close this blade.</div>`
                : `
                  <div class="okbox mb8">Azure resources created. Copy the project key — you will paste it in the Appliance Configuration Manager.</div>
                  <div class="form-row">
                    <label>Project key</label>
                    <div class="keybox" id="proj-key">${esc(state.projectKey)}</div>
                  </div>
                  <div class="flex">
                    <button class="btn btn-ghost btn-sm" id="copy-key" style="color:#323130;border:1px solid #d2d0ce">Copy key</button>
                    <button class="btn btn-primary btn-sm" id="dl-ova">Download OVA (VMware)</button>
                  </div>
                  ${state.ovaDownloaded ? `<div class="okbox mt12">Downloaded AzureMigrateAppliance.ova (simulated 12.4 GB) to the jump box.</div>` : ""}
                `
            }
          </div>
          <div class="blade-f">
            <button class="btn btn-ghost" id="close-disc" style="color:#323130;border:1px solid #d2d0ce">Close</button>
          </div>
        </div>
      </div>`;
  }

  function renderDiscovered() {
    if (!state.discovered) {
      return `
        <div class="crumb">Azure Migrate / Discovered servers</div>
        <h1>Discovered servers</h1>
        <p class="sub">Waiting for the appliance to publish inventory…</p>
        <div class="card"><div class="card-b">
          <div class="note">${state.discovering ? `<span class="spin"></span> Discovery in progress (${state.discProgress}%).` : "No servers yet. Finish appliance discovery first."}</div>
        </div></div>`;
    }
    return `
      <div class="crumb">Azure Migrate / Discovered servers</div>
      <h1>Discovered servers</h1>
      <p class="sub">Appliance contosoappl01 · vCenter vcenter.contoso.local · last heartbeat just now</p>
      <div class="card">
        <div class="card-b" style="padding:0">
          <table class="table">
            <thead><tr><th></th><th>Name</th><th>OS</th><th>vCPU / RAM</th><th>IP</th><th>Power</th><th>VMware Tools</th></tr></thead>
            <tbody>
              ${INVENTORY.map(
                (v) => `<tr data-vm="${v.id}" style="cursor:pointer">
                  <td>${v.target ? "★" : ""}</td>
                  <td><b>${v.name}</b></td>
                  <td>${v.os}</td>
                  <td>${v.cpu} / ${v.mem} GB</td>
                  <td class="mono">${v.ip}</td>
                  <td><span class="badge badge-ok">${v.power}</span></td>
                  <td>${v.tools.split("(")[0]}</td>
                </tr>`
              ).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <p class="muted mt8" style="font-size:12px">★ WEB-01 is the required migration target for this lab.</p>`;
  }

  function renderVmBlade() {
    const v = INVENTORY.find((x) => x.id === state.selectedVm) || INVENTORY[0];
    return `
      <div class="crumb">Azure Migrate / Discovered servers / ${v.name}</div>
      <h1>${v.name}</h1>
      <p class="sub">${v.os} · ${v.host} · ${v.cluster}</p>
      <div class="grid-2">
        <div class="card"><div class="card-h">Properties</div><div class="card-b" style="font-size:13px">
          ${kv("Power state", v.power)}
          ${kv("IP address", v.ip)}
          ${kv("vCPU / Memory", v.cpu + " / " + v.mem + " GB")}
          ${kv("Disks", v.disks)}
          ${kv("VMware Tools", v.tools)}
          ${kv("Applications", v.apps)}
          ${kv("Fabric", "VMware vSphere 8.0")}
        </div></div>
        <div class="card"><div class="card-h">Disks & NICs</div><div class="card-b">
          <table class="table">
            <thead><tr><th>Disk</th><th>Size</th></tr></thead>
            ${v.disksDetail.map((d) => `<tr><td>${d.name}</td><td>${d.size} GB</td></tr>`).join("")}
          </table>
          <table class="table mt12">
            <thead><tr><th>NIC</th><th>IP</th><th>MAC</th></tr></thead>
            ${v.nics.map((n) => `<tr><td>${n.name}</td><td class="mono">${n.ip}</td><td class="mono">${n.mac}</td></tr>`).join("")}
          </table>
        </div></div>
      </div>
      <button class="btn btn-ghost mt16" id="back-disc" style="color:#323130;border:1px solid #d2d0ce">Back to inventory</button>`;
  }

  function kv(k, v) {
    return `<div style="display:grid;grid-template-columns:160px 1fr;gap:6px;padding:6px 0;border-bottom:1px solid #f3f2f1"><b>${k}</b><span>${v}</span></div>`;
  }

  function renderAssessHub() {
    return `
      <div class="crumb">Azure Migrate / Assessments</div>
      <h1>Assessments</h1>
      <p class="sub">Azure VM assessments estimate readiness, SKU, and monthly cost.</p>
      <button class="btn btn-primary mb8" id="btn-new-assess">Create assessment</button>
      ${
        state.assessmentReady
          ? `<div class="card mt12">
              <div class="card-h">Assess-Contoso-Wave1 <span class="badge badge-ok">Ready</span></div>
              <div class="card-b">
                <div class="grid-2">
                  <div class="kpi"><div class="l">Azure readiness</div><div class="v" style="color:#107c10;font-size:18px">3 Ready · 1 with conditions</div></div>
                  <div class="kpi"><div class="l">Est. monthly compute + storage</div><div class="v az">$${monthlyTotal().toFixed(0)}</div></div>
                </div>
                <table class="table mt16">
                  <thead><tr><th>Server</th><th>Readiness</th><th>Suggested SKU</th><th>Compute</th><th>Storage</th><th>CPU / Mem</th></tr></thead>
                  ${INVENTORY.map(
                    (v) => `<tr>
                      <td>${v.name}</td>
                      <td><span class="badge ${v.ready.startsWith("Ready for") ? "badge-ok" : "badge-warn"}">${v.ready}</span></td>
                      <td class="mono">${v.sku}</td>
                      <td>$${v.cost.toFixed(2)}</td>
                      <td>$${v.storage.toFixed(2)}</td>
                      <td>${v.cpuPct}% / ${v.memPct}%</td>
                    </tr>`
                  ).join("")}
                </table>
                <div class="warnbox mt12">SQL-01 is Ready with conditions: consider Azure SQL or SQL on Azure VM with Premium SSD P30 for the 500 GB data disk (1,400 IOPS observed).</div>
              </div>
            </div>`
          : `<div class="note mt12">No assessments yet. Create Assess-Contoso-Wave1 and include WEB-01 in group Wave1-VMware.</div>`
      }`;
  }

  function monthlyTotal() {
    return INVENTORY.reduce((s, v) => s + v.cost + v.storage, 0);
  }

  function renderAssessBlade() {
    return `
      <div class="blade">
        <div class="blade-p">
          <div class="blade-h"><h2>Create assessment</h2></div>
          <div class="blade-b">
            <div class="form-row"><label class="req">Assessment type</label>
              <select><option>Azure VM</option><option>Azure VMware Solution</option><option>Azure SQL</option></select>
            </div>
            <div class="form-row"><label>Discovery source</label>
              <select><option>Servers discovered from Azure Migrate appliance</option></select>
            </div>
            <div class="form-row"><label class="req">Assessment name</label>
              <input id="assess-name" type="text" value="${esc(state.assessName)}" />
            </div>
            <div class="form-row"><label class="req">Group</label>
              <input id="group-name" type="text" value="${esc(state.groupName)}" />
              <div class="help">Create new group Wave1-VMware</div>
            </div>
            <div class="form-row"><label>Target location</label>
              <select id="assess-tgt">${["East US", "West Europe", "Central India", "Southeast Asia"]
                .map((r) => `<option ${state.assessTarget === r ? "selected" : ""}>${r}</option>`)
                .join("")}</select>
            </div>
            <div class="form-row"><label>Sizing criterion</label>
              <select id="assess-size">
                <option ${state.assessSizing === "Performance-based" ? "selected" : ""}>Performance-based</option>
                <option ${state.assessSizing === "As-is on-premises" ? "selected" : ""}>As-is on-premises</option>
              </select>
            </div>
            <div class="form-row"><label>Servers in group</label>
              ${INVENTORY.map(
                (v) => `<div class="check"><input type="checkbox" data-avm="${v.id}" ${state.selectedForAssess[v.id] ? "checked" : ""} /> ${v.name} (${v.os})</div>`
              ).join("")}
            </div>
          </div>
          <div class="blade-f">
            <button class="btn btn-ghost" id="close-assess" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
            <button class="btn btn-primary" id="do-assess">Create assessment</button>
          </div>
        </div>
      </div>`;
  }

  function renderReplHub() {
    const web = INVENTORY[0];
    return `
      <div class="crumb">Azure Migrate / Migration and modernization</div>
      <h1>Replicating servers</h1>
      <p class="sub">Agentless VMware replication via appliance ${LAB.creds.applianceName}</p>
      <div class="flex mb8">
        <button class="btn btn-primary btn-sm" id="btn-replicate">Replicate</button>
        ${state.protected && !state.testRunning && !state.testCleaned ? `<button class="btn btn-ghost btn-sm" id="btn-test" style="color:#323130;border:1px solid #d2d0ce">Test migration</button>` : ""}
        ${state.testRunning ? `<button class="btn btn-ghost btn-sm" id="btn-clean-test" style="color:#323130;border:1px solid #d2d0ce">Clean up test migration</button>` : ""}
        ${state.protected && !state.migrated ? `<button class="btn btn-primary btn-sm" id="btn-cut">Migrate</button>` : ""}
        ${state.migrated && !state.stoppedRep ? `<button class="btn btn-ghost btn-sm" id="btn-stoprep" style="color:#323130;border:1px solid #d2d0ce">Stop replication</button>` : ""}
      </div>
      ${
        !state.replicating && !state.protected && !state.migrated
          ? `<div class="note">No replicating machines. Select Replicate and choose WEB-01.</div>`
          : `<div class="card"><div class="card-b" style="padding:0">
              <table class="table">
                <thead><tr><th>Server</th><th>Status</th><th>Health</th><th>Progress</th><th>Target</th><th>Test migration</th></tr></thead>
                <tr>
                  <td><b>${web.name}</b><div class="muted">${web.os}</div></td>
                  <td>${replStatus()}</td>
                  <td>${state.migrated ? '<span class="badge badge-ok">Migrated</span>' : '<span class="badge badge-ok">Healthy</span>'}</td>
                  <td style="min-width:160px">
                    <div class="progress ${state.protected || state.migrated ? "ok" : ""}"><i style="width:${state.migrated ? 100 : state.replPct}%"></i></div>
                    <div class="muted" style="font-size:11px">${state.migrated ? "Cutover complete" : state.protected ? "Protected · delta sync" : "Initial replication " + state.replPct + "%"}</div>
                  </td>
                  <td class="mono">${state.replSku}<br>${state.replVnet}/${state.replSubnet}</td>
                  <td>${state.testCleaned ? "Cleaned up" : state.testRunning ? "Test VM running" : state.protected ? "Not started" : "—"}</td>
                </tr>
              </table>
            </div></div>`
      }
      ${state.migrated ? renderPostCut() : ""}`;
  }

  function replStatus() {
    if (state.migrated) return '<span class="badge badge-ok">Migration completed</span>';
    if (state.protected) return '<span class="badge badge-ok">Protected</span>';
    if (state.replicating) return '<span class="badge badge-info">Initial replication</span>';
    return '<span class="badge badge-muted">Not started</span>';
  }

  function renderPostCut() {
    return `
      <div class="okbox mt16">
        <b>WEB-01</b> is running in Azure · resource group rg-migrate-prod · private IP 10.20.1.11 · NIC on snet-web.
        ${state.stoppedRep ? " Replication stopped and on-premises snapshots cleaned up." : " Stop replication when you are satisfied with the cutover."}
      </div>
      <div class="card mt12"><div class="card-h">Post-migration checklist</div><div class="card-b" style="font-size:13px">
        <div class="check"><input type="checkbox" checked disabled /> Planned shutdown completed; last CBT delta applied</div>
        <div class="check"><input type="checkbox" checked disabled /> Azure VM agent present (hydration)</div>
        <div class="check"><input type="checkbox" ${state.stoppedRep ? "checked" : ""} disabled /> Stop replication / remove mobility state</div>
        <div class="check"><input type="checkbox" disabled /> Update DNS (web.contoso.com → 10.20.1.11)</div>
        <div class="check"><input type="checkbox" disabled /> Retire source VM from vCenter backups on the next CAB window</div>
      </div></div>`;
  }

  function renderReplBlade() {
    return `
      <div class="blade">
        <div class="blade-p">
          <div class="blade-h"><h2>Replicate</h2>
            <div class="muted" style="font-size:12px">Wizard step: ${state.replPhase}</div>
          </div>
          <div class="blade-b">
            ${
              state.replPhase === "source"
                ? `
              <div class="form-row"><label class="req">Are your machines virtualized?</label>
                <select><option>Yes, with VMware vSphere hypervisor</option></select></div>
              <div class="form-row"><label class="req">On-premises appliance</label>
                <select><option>${LAB.creds.applianceName} (Registered)</option></select></div>
              <div class="form-row"><label>Migration method</label>
                <div class="radio"><input type="radio" checked /> Agentless (recommended)</div>
                <div class="radio"><input type="radio" disabled /> Agent-based (Mobility service)</div>
              </div>`
                : state.replPhase === "vms"
                ? `
              <div class="form-row"><label class="req">Virtual machines</label>
                ${INVENTORY.map(
                  (v) => `<div class="check"><input type="checkbox" data-rvm="${v.id}" ${state.replVm[v.id] ? "checked" : ""} /> ${v.name} · ${v.os}</div>`
                ).join("")}
                <div class="help">Lab requires WEB-01. You may leave the others unchecked.</div>
              </div>`
                : `
              <div class="form-row"><label class="req">Subscription / RG</label>
                <input type="text" value="${esc(state.replRg)}" id="repl-rg" /></div>
              <div class="form-row"><label class="req">Target region</label>
                <select id="repl-reg"><option>East US</option><option>West Europe</option></select></div>
              <div class="form-row"><label class="req">Virtual network / subnet</label>
                <div class="inline">
                  <select id="repl-vnet"><option>vnet-landing-eus</option><option>vnet-hub-eus</option></select>
                  <select id="repl-sub"><option>snet-web</option><option>snet-app</option></select>
                </div>
              </div>
              <div class="form-row"><label>Availability</label>
                <select><option>No infrastructure redundancy required</option><option>Availability zone 1</option></select></div>
              <div class="form-row"><label>WEB-01 VM size</label>
                <select id="repl-sku"><option>Standard_D4s_v5 (assessment)</option><option>Standard_D2s_v5</option><option>Standard_E4s_v5</option></select></div>
              <div class="check"><input type="checkbox" id="hybrid" ${state.hybrid ? "checked" : ""} /> Apply Azure Hybrid Benefit (Windows Server SA)</div>
              <div class="note mt12">Disks will be created as managed disks. Initial replication uses a vSphere snapshot; CBT sends only changed blocks afterwards.</div>`
            }
          </div>
          <div class="blade-f">
            <button class="btn btn-ghost" id="close-repl" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
            ${state.replPhase !== "source" ? `<button class="btn btn-ghost" id="repl-back" style="color:#323130;border:1px solid #d2d0ce">Back</button>` : ""}
            <button class="btn btn-primary" id="repl-next">${state.replPhase === "target" ? "Replicate" : "Next"}</button>
          </div>
        </div>
      </div>`;
  }

  function renderTestBlade() {
    return `
      <div class="blade"><div class="blade-p">
        <div class="blade-h"><h2>Test migration · WEB-01</h2></div>
        <div class="blade-b">
          <div class="note mb8">The on-premises VM keeps running. A new Azure VM is created from the latest recovery point in an isolated network.</div>
          <div class="form-row"><label class="req">Virtual network</label>
            <select id="test-vnet">
              <option value="vnet-test-eus" ${state.testVnet === "vnet-test-eus" ? "selected" : ""}>vnet-test-eus (recommended · no peering)</option>
              <option value="vnet-landing-eus">vnet-landing-eus (production — do not use)</option>
            </select>
          </div>
          <div class="form-row"><label>Subnet</label><select><option>snet-test</option></select></div>
          ${state.testing ? `<div class="note"><span class="spin"></span> Creating test VM from recovery point… ${state.testPct}%</div>` : ""}
        </div>
        <div class="blade-f">
          <button class="btn btn-ghost" id="close-test" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
          <button class="btn btn-primary" id="do-test" ${state.testing ? "disabled" : ""}>Test migrate</button>
        </div>
      </div></div>`;
  }

  function renderCutBlade() {
    return `
      <div class="blade"><div class="blade-p">
        <div class="blade-h"><h2>Migrate · WEB-01</h2></div>
        <div class="blade-b">
          <div class="form-row">
            <label class="req">Shut down virtual machines and perform a planned migration with no data loss?</label>
            <div class="radio"><input type="radio" name="sd" value="yes" ${state.shutdown === "yes" ? "checked" : ""} /> Yes — appliance will shut down the VM via vCenter, replicate the last delta, then cut over</div>
            <div class="radio"><input type="radio" name="sd" value="no" ${state.shutdown === "no" ? "checked" : ""} /> No — migrate immediately (possible data loss)</div>
          </div>
          <div class="warnbox">Downtime equals shutdown + last delta + Azure VM boot (typically several minutes for WEB-01).</div>
          ${state.migrating ? `<div class="note mt12"><span class="spin"></span> ${cutMsg()} · ${state.migPct}%</div>` : ""}
        </div>
        <div class="blade-f">
          <button class="btn btn-ghost" id="close-cut" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
          <button class="btn btn-primary" id="do-cut" ${state.migrating ? "disabled" : ""}>OK</button>
        </div>
      </div></div>`;
  }

  function cutMsg() {
    if (state.migPct < 25) return "Requesting guest shutdown via vCenter";
    if (state.migPct < 55) return "Replicating final CBT delta";
    if (state.migPct < 80) return "Creating Azure VM and attaching managed disks";
    return "Starting WEB-01 in East US";
  }

  function renderAzVm() {
    if (!state.migrated) {
      return `<div class="crumb">Virtual machines</div><h1>Virtual machines</h1><p class="sub">No Contoso migrated VMs yet. Complete cutover first.</p>`;
    }
    return `
      <div class="crumb">Virtual machines</div>
      <h1>WEB-01</h1>
      <p class="sub">Virtual machine · East US · rg-migrate-prod</p>
      <div class="grid-2">
        <div class="kpi"><div class="l">Status</div><div class="v" style="color:#107c10">Running</div></div>
        <div class="kpi"><div class="l">Private IP</div><div class="v az" style="font-size:20px">10.20.1.11</div></div>
        <div class="kpi"><div class="l">Size</div><div class="v" style="font-size:18px">Standard_D4s_v5</div></div>
        <div class="kpi"><div class="l">OS disk</div><div class="v" style="font-size:18px">Premium SSD P10 · 80 GB</div></div>
      </div>`;
  }

  /* ---------- VSPHERE ---------- */
  function renderVsphere() {
    if (!state.vcAuthed) {
      return `
        <div class="vc" style="display:grid;place-items:center;min-height:100%">
          <div style="width:400px;background:#22262e;border:1px solid #343b48;padding:24px;border-radius:8px">
            <div class="vc-logo" style="margin-bottom:8px">VMware vSphere Client</div>
            <div class="muted" style="font-size:12px;margin-bottom:14px">${LAB.creds.vcenter}</div>
            <div class="form-row"><label>User name</label><input id="vc-u" type="text" value="${esc(state.vcLoginU)}" /></div>
            <div class="form-row"><label>Password</label><input id="vc-p" type="password" value="${esc(state.vcLoginP)}" /></div>
            ${state.vcError ? `<div class="errbox mb8">${state.vcError}</div>` : ""}
            <button class="btn btn-primary" id="vc-login">Login</button>
            <p class="muted mt12" style="font-size:12px">Use ${LAB.creds.vcenterUser}</p>
          </div>
        </div>`;
    }
    const steps = ["1 Source", "2 Name", "3 Location", "4 Compute", "5 Storage", "6 Disks", "7 Network", "8 Ready"];
    return `
      <div class="vc">
        <div class="vc-top">
          <div class="vc-logo">vSphere Client</div>
          <div class="vc-tabs"><span>Menu</span><span class="on">Hosts and Clusters</span><span>VMs and Templates</span><span>Storage</span></div>
          <span class="right muted" style="font-size:12px">${LAB.creds.vcenterUser}</span>
        </div>
        <div class="vc-body">
          <div class="vc-tree">
            <div class="tree-item">vcenter.contoso.local</div>
            <div class="tree-item on">  Contoso-DC1</div>
            <div class="tree-item">   Prod-Cluster</div>
            <div class="tree-item">    esxi-prod-01</div>
            <div class="tree-item">    esxi-prod-02</div>
            <div class="tree-item">   Migrate</div>
            ${state.ovfDeployed ? `<div class="tree-item">    AzureMigrateAppl ${state.poweredOn ? "●" : "○"}</div>` : ""}
          </div>
          <div class="vc-main">
            <div class="flex" style="justify-content:space-between">
              <h2>Deploy OVF Template</h2>
              ${state.ovfDeployed && !state.poweredOn ? `<button class="btn btn-primary btn-sm" id="power-on">Power on AzureMigrateAppl</button>` : ""}
              ${state.poweredOn ? `<span class="badge badge-ok">Powered On · ${LAB.creds.applianceIp}</span>` : ""}
            </div>
            ${
              state.ovfDeployed
                ? `<div class="okbox">OVA deployed to Prod-Cluster / vsanDatastore / VM-Network.
                    ${state.poweredOn ? " Guest hostname AzureMigrateAppl, IPv4 10.10.1.50. Open https://10.10.1.50:44368 in the next module." : " Power on the VM to receive a DHCP address on VM-Network."}</div>`
                : `<div class="wiz">
                    <div class="wiz-h">Deploy OVF Template · AzureMigrateAppliance.ova</div>
                    <div class="wiz-steps">${steps
                      .map((s, i) => `<span class="${i === state.ovfStep ? "on" : i < state.ovfStep ? "done" : ""}">${s}</span>`)
                      .join("")}</div>
                    <div class="wiz-b">${renderOvfStep()}</div>
                    <div class="flex" style="padding:12px 16px;border-top:1px solid #343b48;justify-content:flex-end">
                      <button class="btn btn-ghost btn-sm" id="ovf-back" ${state.ovfStep === 0 ? "disabled" : ""}>Back</button>
                      <button class="btn btn-primary btn-sm" id="ovf-next">${state.ovfStep === 7 ? "Finish" : "Next"}</button>
                    </div>
                  </div>`
            }
          </div>
        </div>
      </div>`;
  }

  function renderOvfStep() {
    const o = state.ovf;
    switch (state.ovfStep) {
      case 0:
        return `<div class="form-row"><label>Select an OVF or OVA</label>
          <input type="text" value="${esc(o.source)}" id="ovf-src" />
          <div class="help">Use the OVA downloaded from Azure Migrate (hash verified in a real lab).</div></div>`;
      case 1:
        return `<div class="form-row"><label>Virtual machine name</label>
          <input id="ovf-name" type="text" value="${esc(o.name)}" />
          <div class="help">Lab standard: AzureMigrateAppl</div></div>`;
      case 2:
        return `<div class="form-row"><label>Select a location (folder)</label>
          <select id="ovf-folder"><option>Contoso-DC1 / Migrate</option><option>Contoso-DC1 / Prod</option></select></div>`;
      case 3:
        return `<div class="form-row"><label>Compute resource</label>
          <select id="ovf-compute"><option>Prod-Cluster</option><option>esxi-prod-01.contoso.local</option></select>
          <div class="help">Needs 8 vCPU, 32 GB RAM, ~80 GB disk free.</div></div>`;
      case 4:
        return `<div class="form-row"><label>Select storage</label>
          <select id="ovf-storage"><option>vsanDatastore</option><option>nfs-migrate01</option></select></div>`;
      case 5:
        return `<div class="form-row"><label>Disk format</label>
          <select id="ovf-disk">
            <option>Thick Provision Lazy Zeroed</option>
            <option>Thick Provision Eager Zeroed</option>
            <option>Thin Provision</option>
          </select></div>`;
      case 6:
        return `<div class="form-row"><label>Destination network</label>
          <select id="ovf-net"><option>VM-Network</option><option>Isolated-Lab (no internet)</option></select>
          <div class="warnbox mt8">VM-Network has a default route and HTTPS to Azure. Isolated-Lab will fail appliance registration.</div></div>`;
      default:
        return `<table class="table">
          <tr><td>Source</td><td class="mono">${esc(o.source)}</td></tr>
          <tr><td>Name</td><td>${esc(o.name)}</td></tr>
          <tr><td>Folder</td><td>${esc(o.folder)}</td></tr>
          <tr><td>Compute</td><td>${esc(o.compute)}</td></tr>
          <tr><td>Storage</td><td>${esc(o.storage)}</td></tr>
          <tr><td>Disk</td><td>${esc(o.disk)}</td></tr>
          <tr><td>Network</td><td>${esc(o.network)}</td></tr>
        </table>`;
    }
  }

  /* ---------- APPLIANCE ---------- */
  function renderAppliance() {
    const tabs = [
      ["prereq", "1 Prerequisites & register"],
      ["vddk", "2 Install VDDK"],
      ["discover", "3 Manage discovery"],
    ];
    return `
      <div class="appm">
        <div class="appm-top">
          <div class="ms">Microsoft</div>
          <div style="font-weight:600">Azure Migrate appliance configuration manager</div>
          <span class="right muted" style="font-size:12px">${LAB.creds.applianceHost} · ${LAB.creds.applianceIp}</span>
        </div>
        <div class="appm-layout">
          <div class="appm-side">
            ${tabs
              .map(
                ([id, t]) =>
                  `<div class="s ${state.applTab === id ? "on" : ""} ${(id === "prereq" && state.registered) || (id === "vddk" && state.vddk) || (id === "discover" && state.discovering) ? "done" : ""}" data-atab="${id}">${t}</div>`
              )
              .join("")}
            <div class="note mt16" style="font-size:12px">This UI is served on TCP <b>44368</b>. In production allow it from your jump box only.</div>
          </div>
          <div class="appm-main">${renderApplMain()}</div>
        </div>
      </div>`;
  }

  function renderApplMain() {
    if (state.applTab === "prereq") return renderApplPrereq();
    if (state.applTab === "vddk") return renderApplVddk();
    return renderApplDisc();
  }

  function chkIcon(st) {
    if (st === "ok") return '<span class="badge badge-ok">Passed</span>';
    if (st === "run") return '<span class="spin"></span>';
    if (st === "fail") return '<span class="badge badge-err">Failed</span>';
    return '<span class="badge badge-muted">Not started</span>';
  }

  function renderApplPrereq() {
    return `
      <h2 style="margin:0 0 8px">Set up prerequisites and register the appliance</h2>
      <p class="sub">The appliance verifies internet access, time sync, then auto-updates and registers with your project.</p>
      <div class="card"><div class="card-b">
        <div class="check-row"><div>Connectivity to Azure Migrate endpoints (TCP 443)</div>${chkIcon(state.checks.net)}</div>
        <div class="check-row"><div>Time synchronization with internet time</div>${chkIcon(state.checks.time)}</div>
        <div class="check-row"><div>Required URLs reachable (*.microsoftonline.com, *.azure.com, *.blob.core.windows.net)</div>${chkIcon(state.checks.urls)}</div>
        <button class="btn btn-primary mt12" id="run-checks" ${state.checks.net === "ok" ? "disabled" : ""}>Run checks</button>
      </div></div>
      <div class="card mt16"><div class="card-h">Install updates and register appliance</div><div class="card-b">
        <div class="form-row"><label class="req">Paste the Azure Migrate project key</label>
          <textarea id="key-in" ${state.keyAccepted ? "disabled" : ""}>${esc(state.keyInput)}</textarea>
        </div>
        <button class="btn btn-primary" id="verify-key" ${!state.checks.net || state.checks.net !== "ok" || state.keyAccepted ? "disabled" : ""}>Verify key</button>
        ${state.keyAccepted ? `<div class="okbox mt12">Key accepted for appliance <b>${LAB.creds.applianceName}</b>.</div>` : ""}
        ${state.updating ? `<div class="note mt12"><span class="spin"></span> Auto-update service is upgrading DRA, Gateway, Discovery and Assessment agents…</div>` : ""}
        ${
          state.updated
            ? `<div class="okbox mt12">Services current:
                <div class="mono mt8">Discovery agent 6.1.312 · Assessment agent 6.1.312 · DRA 2.0.991 · Gateway 1.39 · Auto-update 1.0.9</div>
              </div>`
            : ""
        }
        ${
          state.keyAccepted && state.updated && !state.registered
            ? `<div class="mt16">
                <div class="note mb8">Select Login. Enter device code <b class="mono">${state.deviceCode}</b> as ${LAB.creds.azureUser}.</div>
                <button class="btn btn-primary" id="aad-login">Login</button>
              </div>`
            : ""
        }
        ${state.aadPhase === "code" ? renderDeviceLogin() : ""}
        ${state.registered ? `<div class="okbox mt12">Appliance registered to project <b>${LAB.creds.projectName}</b> · subscription Contoso-Prod · RG ${LAB.creds.rgName}.</div>` : ""}
      </div></div>`;
  }

  function renderDeviceLogin() {
    return `
      <div class="modal-mini"><div class="box">
        <div style="font-size:13px;color:#605e5c">microsoft.com/devicelogin</div>
        <h3 style="margin:8px 0">Enter code</h3>
        <input id="dev-code" type="text" value="" placeholder="${state.deviceCode}" />
        <p class="muted" style="font-size:12px">Use ${state.deviceCode}</p>
        <div class="flex mt12">
          <button class="btn btn-primary" id="dev-ok">Continue</button>
          <button class="btn btn-ghost" id="dev-cancel" style="color:#323130;border:1px solid #d2d0ce">Cancel</button>
        </div>
      </div></div>`;
  }

  function renderApplVddk() {
    return `
      <h2 style="margin:0 0 8px">Install VMware vSphere VDDK</h2>
      <p class="sub">Required for agentless replication. The appliance uses VDDK to read VM disks from ESXi over NFC after a snapshot.</p>
      <div class="card"><div class="card-b">
        <div class="form-row"><label>VDDK package</label>
          <select><option>VMware-vix-disklib-8.0.2-x86_64.zip (lab cache)</option></select>
        </div>
        ${state.vddk ? `<div class="okbox">VDDK 8.0.2 extracted to C:\\Program Files\\VMware\\VMware Virtual Disk Development Kit</div>` : `<button class="btn btn-primary" id="inst-vddk">Install VDDK 8.0</button>`}
      </div></div>`;
  }

  function renderApplDisc() {
    return `
      <h2 style="margin:0 0 8px">Start continuous discovery</h2>
      <p class="sub">Provide vCenter credentials and the discovery source. Optionally add guest credentials for software inventory.</p>
      <div class="card"><div class="card-h">Step 1 · vCenter Server credentials</div><div class="card-b">
        <div class="form-row"><label>Friendly name</label><input id="cred-name" value="${esc(state.credName)}" /></div>
        <div class="form-row"><label class="req">User name</label><input id="cred-user" value="${esc(state.credUser)}" placeholder="migrate-svc@vsphere.local" /></div>
        <div class="form-row"><label class="req">Password</label><input id="cred-pass" type="password" value="${esc(state.credPass)}" /></div>
        <button class="btn btn-primary btn-sm" id="save-cred" ${state.credsSaved ? "disabled" : ""}>${state.credsSaved ? "Saved" : "Add credentials"}</button>
        ${state.credsSaved ? `<div class="okbox mt12">Credential vcenter-prod validated (Read-only + Guest Operations).</div>` : ""}
      </div></div>
      <div class="card mt16"><div class="card-h">Step 2 · vCenter Server details</div><div class="card-b">
        <div class="inline">
          <div class="form-row" style="flex:1"><label>FQDN or IP</label><input id="src-fqdn" value="${esc(state.srcFqdn)}" /></div>
          <div class="form-row" style="width:100px"><label>Port</label><input id="src-port" value="${esc(state.srcPort)}" /></div>
        </div>
        <button class="btn btn-primary btn-sm" id="save-src" ${!state.credsSaved || state.srcSaved ? "disabled" : ""}>${state.srcSaved ? "Added" : "Add discovery source"}</button>
        ${state.srcSaved ? `<div class="okbox mt12">Connected to ${LAB.creds.vcenter} · build 8.0.3 · 2 hosts · 4 VMs in scope.</div>` : ""}
      </div></div>
      <div class="card mt16"><div class="card-h">Step 3 · Start discovery</div><div class="card-b">
        <div class="check"><input type="checkbox" checked /> Discover installed applications (uses guest credentials / VMware Tools)</div>
        <div class="check"><input type="checkbox" checked /> Enable agentless dependency analysis</div>
        ${state.discovering ? `<div class="note mt12"><span class="spin"></span> Continuous discovery running · inventory ${state.discProgress}%</div>` : ""}
        ${state.discovered ? `<div class="okbox mt12">Published 4 servers to project ${LAB.creds.projectName}. Return to the Azure portal.</div>` : ""}
        <button class="btn btn-primary mt12" id="start-disc" ${!state.srcSaved || state.discovering ? "disabled" : ""}>Start discovery</button>
      </div></div>`;
  }

  /* ---------- QUIZ / COMPLETE ---------- */
  function renderQuiz() {
    return `
      <div class="quiz">
        <h1 style="margin-top:0">Knowledge check</h1>
        <p class="sub">10 questions · 70% required to complete the lab.</p>
        ${QUIZ.map(
          (q, i) => `
          <div class="qcard">
            <h4>${i + 1}. ${q.q}</h4>
            ${q.options
              .map((o, j) => {
                let cls = "qopt";
                if (state.quizSel[i] === j) cls += " sel";
                if (state.quizSubmitted) {
                  if (j === q.a) cls += " good";
                  else if (state.quizSel[i] === j) cls += " bad";
                }
                return `<button class="${cls}" data-qi="${i}" data-qj="${j}" ${state.quizSubmitted ? "disabled" : ""}>${o}</button>`;
              })
              .join("")}
          </div>`
        ).join("")}
        ${
          !state.quizSubmitted
            ? `<button class="btn btn-primary" id="quiz-sub">Submit answers</button>`
            : `<div class="${state.quizScore >= 70 ? "okbox" : "errbox"}">You scored ${state.quizScore}%. ${
                state.quizScore >= 70 ? "Passed — continue to the recap." : "Review the highlighted answers and use instructor complete if you need to proceed."
              }</div>`
        }
      </div>`;
  }

  function renderComplete() {
    const tasksTotal = STEPS.reduce((s, st) => s + st.tasks.length, 0);
    const tasksDone = Object.keys(state.done).length;
    return `
      <div class="cert">
        <div class="cert-card">
          <div class="kicker" style="color:var(--azure)">Contoso Cloud Academy</div>
          <h1>Lab complete</h1>
          <p>You created an Azure Migrate project, deployed and registered the VMware appliance, discovered Contoso’s vCenter inventory, assessed Wave 1, and cut WEB-01 over to East US with a planned migration.</p>
          <div class="grid-2">
            <div><div class="muted">Score</div><div class="score-ring">${state.score}</div></div>
            <div>
              <div class="muted">Tasks</div><div style="font-size:28px;font-weight:700">${tasksDone}/${tasksTotal}</div>
              <div class="muted mt8">Knowledge check</div><div style="font-size:22px;font-weight:700">${state.quizScore}%</div>
              <div class="muted mt8">Duration</div><div style="font-size:22px;font-weight:700">${elapsed()}</div>
            </div>
          </div>
          <h3>What you built</h3>
          <ul style="font-size:14px;line-height:1.55">
            <li>Project <b>${LAB.creds.projectName}</b> in <b>${LAB.creds.rgName}</b> (Asia metadata)</li>
            <li>Appliance <b>${LAB.creds.applianceName}</b> at 10.10.1.50, registered + VDDK 8.0</li>
            <li>4 discovered VMs · assessment Assess-Contoso-Wave1</li>
            <li>WEB-01 → Standard_D4s_v5 on vnet-landing-eus/snet-web · 10.20.1.11</li>
          </ul>
          <div class="flex">
            <button class="btn btn-primary" id="btn-restart">Run lab again</button>
            <a class="btn btn-ghost" style="color:#323130;border:1px solid #d2d0ce;text-decoration:none" href="lab-guide.html" target="_blank">Open student guide</a>
          </div>
        </div>
      </div>`;
  }

  /* ---------- RENDER ROOT ---------- */
  function render() {
    const root = $("#app");
    root.innerHTML = state.screen === "splash" ? renderSplash() : renderLab();
    bind();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- EVENTS ---------- */
  function bind() {
    $("#btn-start")?.addEventListener("click", () => {
      state.screen = "lab";
      state.startedAt = Date.now();
      render();
    });
    $("#btn-guide")?.addEventListener("click", () => window.open("lab-guide.html", "_blank"));
    $("#btn-brief")?.addEventListener("click", () => {
      state.screen = "splash";
      render();
    });
    $("#btn-next")?.addEventListener("click", () => {
      if (stepComplete(state.step) && state.step < STEPS.length - 1) goStep(state.step + 1);
    });
    $("#btn-skip")?.addEventListener("click", instructorComplete);
    document.querySelectorAll("[data-step]").forEach((b) =>
      b.addEventListener("click", () => goStep(Number(b.dataset.step)))
    );

    // login
    $("#login-next")?.addEventListener("click", () => {
      state.loginUser = $("#login-user").value.trim();
      if (state.loginUser.toLowerCase() !== LAB.creds.azureUser) {
        state.loginError = "That account is not in the Contoso tenant. Use admin@contoso.com.";
      } else {
        state.loginError = "";
        state.loginPhase = "pass";
      }
      render();
    });
    $("#login-go")?.addEventListener("click", () => {
      state.loginPass = $("#login-pass").value;
      if (state.loginPass !== LAB.creds.azurePass) {
        state.loginError = "Incorrect password. Check the briefing card.";
        render();
        return;
      }
      state.azureAuthed = true;
      state.portalView = "home";
      mark("login", 20);
    });
    $("#login-user")?.addEventListener("keydown", (e) => e.key === "Enter" && $("#login-next").click());
    $("#login-pass")?.addEventListener("keydown", (e) => e.key === "Enter" && $("#login-go").click());

    // search
    $("#az-search")?.addEventListener("input", (e) => {
      state.searchQ = e.target.value;
      state.searchOpen = state.searchQ.length > 0;
      render();
      const inp = $("#az-search");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(state.searchQ.length, state.searchQ.length);
      }
    });
    $("#az-search")?.addEventListener("focus", () => {
      if (state.searchQ) {
        state.searchOpen = true;
        render();
        $("#az-search")?.focus();
      }
    });
    document.querySelectorAll("[data-goto]").forEach((b) =>
      b.addEventListener("click", () => {
        const g = b.dataset.goto;
        state.searchOpen = false;
        state.searchQ = "";
        if (g === "migrate") {
          state.portalView = "migrate";
          if (STEPS[state.step].id === "create-project") mark("open-migrate", 15);
        } else if (g === "azvm") {
          state.portalView = "azvm";
          if (state.migrated && STEPS[state.step].id === "cutover") mark("verify", 20);
        } else state.portalView = g;
        render();
      })
    );
    document.querySelectorAll("[data-nav]").forEach((b) =>
      b.addEventListener("click", () => {
        state.portalView = b.dataset.nav === "migrate" ? "migrate" : "home";
        render();
      })
    );

    $("#btn-create-proj")?.addEventListener("click", () => {
      state.showCreate = true;
      render();
    });
    $("#close-create")?.addEventListener("click", () => {
      state.showCreate = false;
      render();
    });
    $("#f-rg")?.addEventListener("input", (e) => (state.form.rg = e.target.value));
    $("#f-proj")?.addEventListener("input", (e) => (state.form.project = e.target.value));
    $("#f-geo")?.addEventListener("change", (e) => (state.form.geo = e.target.value));
    document.querySelectorAll("[name=rgmode]").forEach((r) =>
      r.addEventListener("change", (e) => {
        state.rgMode = e.target.value;
      })
    );
    $("#do-create")?.addEventListener("click", createProject);

    $("#btn-discover")?.addEventListener("click", () => {
      state.discoverOpen = true;
      if (STEPS[state.step].id === "discover-key") mark("discover", 15);
      render();
    });
    $("#close-disc")?.addEventListener("click", () => {
      state.discoverOpen = false;
      render();
    });
    $("#appl-name")?.addEventListener("input", (e) => (state.applianceName = e.target.value));
    $("#gen-key")?.addEventListener("click", generateProjectKey);
    $("#copy-key")?.addEventListener("click", () => {
      navigator.clipboard?.writeText(state.projectKey).catch(() => {});
      toast("Project key copied", "ok");
    });
    $("#dl-ova")?.addEventListener("click", () => {
      state.ovaDownloaded = true;
      if (STEPS[state.step].id === "discover-key") mark("dl-ova", 15);
      render();
    });

    $("#btn-open-disc")?.addEventListener("click", () => {
      state.portalView = "discovered";
      render();
    });
    $("#btn-assess")?.addEventListener("click", () => {
      state.portalView = "assess";
      render();
    });
    $("#btn-open-assess")?.addEventListener("click", () => {
      state.portalView = "assess";
      render();
    });
    $("#btn-new-assess")?.addEventListener("click", () => {
      state.assessOpen = true;
      if (STEPS[state.step].id === "assess") mark("new-assess", 10);
      render();
    });
    $("#close-assess")?.addEventListener("click", () => {
      state.assessOpen = false;
      render();
    });
    $("#do-assess")?.addEventListener("click", createAssessment);
    document.querySelectorAll("[data-avm]").forEach((c) =>
      c.addEventListener("change", () => {
        state.selectedForAssess[c.dataset.avm] = c.checked;
      })
    );

    document.querySelectorAll("[data-vm]").forEach((tr) =>
      tr.addEventListener("click", () => {
        state.selectedVm = tr.dataset.vm;
        state.portalView = "vm";
        if (tr.dataset.vm === "web01" && STEPS[state.step].id === "review-disc") mark("open-web", 15);
        render();
      })
    );
    $("#back-disc")?.addEventListener("click", () => {
      state.portalView = "discovered";
      render();
    });

    $("#btn-replicate")?.addEventListener("click", () => {
      state.replOpen = true;
      state.replPhase = "source";
      if (STEPS[state.step].id === "replicate") mark("start-rep", 10);
      render();
    });
    $("#btn-open-repl")?.addEventListener("click", () => {
      state.portalView = "replicate";
      render();
    });
    $("#close-repl")?.addEventListener("click", () => {
      state.replOpen = false;
      render();
    });
    $("#repl-next")?.addEventListener("click", replNext);
    $("#repl-back")?.addEventListener("click", () => {
      state.replPhase = state.replPhase === "target" ? "vms" : "source";
      render();
    });
    document.querySelectorAll("[data-rvm]").forEach((c) =>
      c.addEventListener("change", () => (state.replVm[c.dataset.rvm] = c.checked))
    );

    $("#btn-test")?.addEventListener("click", () => {
      state.testOpen = true;
      render();
    });
    $("#close-test")?.addEventListener("click", () => {
      state.testOpen = false;
      render();
    });
    $("#do-test")?.addEventListener("click", runTest);
    $("#btn-clean-test")?.addEventListener("click", () => {
      state.testRunning = false;
      state.testCleaned = true;
      mark("test-clean", 15);
    });
    $("#btn-cut")?.addEventListener("click", () => {
      state.cutOpen = true;
      render();
    });
    $("#close-cut")?.addEventListener("click", () => {
      state.cutOpen = false;
      render();
    });
    document.querySelectorAll("[name=sd]").forEach((r) =>
      r.addEventListener("change", (e) => (state.shutdown = e.target.value))
    );
    $("#do-cut")?.addEventListener("click", runCutover);
    $("#btn-stoprep")?.addEventListener("click", () => {
      state.stoppedRep = true;
      mark("stop-rep", 20);
    });

    // vsphere
    $("#vc-login")?.addEventListener("click", vcLogin);
    $("#ovf-next")?.addEventListener("click", ovfNext);
    $("#ovf-back")?.addEventListener("click", () => {
      state.ovfStep = Math.max(0, state.ovfStep - 1);
      render();
    });
    $("#power-on")?.addEventListener("click", () => {
      state.poweredOn = true;
      mark("power-on", 20);
    });
    ["ovf-src", "ovf-name", "ovf-folder", "ovf-compute", "ovf-storage", "ovf-disk", "ovf-net"].forEach((id) => {
      const map = {
        "ovf-src": "source",
        "ovf-name": "name",
        "ovf-folder": "folder",
        "ovf-compute": "compute",
        "ovf-storage": "storage",
        "ovf-disk": "disk",
        "ovf-net": "network",
      };
      $(`#${id}`)?.addEventListener("change", (e) => (state.ovf[map[id]] = e.target.value));
      $(`#${id}`)?.addEventListener("input", (e) => (state.ovf[map[id]] = e.target.value));
    });

    // appliance
    document.querySelectorAll("[data-atab]").forEach((el) =>
      el.addEventListener("click", () => {
        state.applTab = el.dataset.atab;
        render();
      })
    );
    $("#run-checks")?.addEventListener("click", runChecks);
    $("#key-in")?.addEventListener("input", (e) => (state.keyInput = e.target.value));
    $("#verify-key")?.addEventListener("click", verifyKey);
    $("#aad-login")?.addEventListener("click", () => {
      state.aadPhase = "code";
      render();
    });
    $("#dev-cancel")?.addEventListener("click", () => {
      state.aadPhase = "idle";
      render();
    });
    $("#dev-ok")?.addEventListener("click", finishAad);
    $("#inst-vddk")?.addEventListener("click", () => {
      state.vddk = true;
      mark("vddk", 20);
    });
    $("#save-cred")?.addEventListener("click", saveCreds);
    $("#save-src")?.addEventListener("click", saveSrc);
    $("#start-disc")?.addEventListener("click", startDiscovery);

    // quiz
    document.querySelectorAll("[data-qi]").forEach((b) =>
      b.addEventListener("click", () => {
        state.quizSel[Number(b.dataset.qi)] = Number(b.dataset.qj);
        render();
      })
    );
    $("#quiz-sub")?.addEventListener("click", submitQuiz);
    $("#btn-restart")?.addEventListener("click", () => location.reload());
  }

  function createProject() {
    const rg = ($("#f-rg")?.value || state.form.rg).trim();
    const proj = ($("#f-proj")?.value || state.form.project).trim();
    const geo = $("#f-geo")?.value || state.form.geo;
    state.form.rg = rg;
    state.form.project = proj;
    state.form.geo = geo;
    if (rg !== LAB.creds.rgName) {
      toast("Use resource group rg-migrate-prod for this lab.", "err");
      return;
    }
    if (proj !== LAB.creds.projectName) {
      toast("Project name must be contoso-vmware-migrate.", "err");
      return;
    }
    if (geo !== "Asia") {
      toast("Lab standard geography is Asia (metadata). You can still migrate to East US.", "err");
      return;
    }
    state.projectDeploying = true;
    render();
    setTimeout(() => {
      state.projectDeploying = false;
      state.projectCreated = true;
      state.showCreate = false;
      state.portalView = "migrate";
      mark("create-rg", 15);
      mark("create-proj", 25);
    }, 1400);
  }

  function generateProjectKey() {
    const name = ($("#appl-name")?.value || state.applianceName).trim();
    state.applianceName = name;
    if (!/^[A-Za-z0-9]{1,14}$/.test(name)) {
      toast("Appliance name must be alphanumeric and ≤ 14 characters.", "err");
      return;
    }
    if (name.toLowerCase() !== LAB.creds.applianceName) {
      toast("Use appliance name contosoappl01 so the rest of the lab matches.", "err");
      return;
    }
    state.keyGenPhase = "creating";
    render();
    setTimeout(() => {
      state.projectKey = generateKey(name);
      state.keyGenPhase = "ready";
      mark("gen-key", 25);
    }, 1600);
  }

  function vcLogin() {
    state.vcLoginU = $("#vc-u").value.trim();
    state.vcLoginP = $("#vc-p").value;
    if (state.vcLoginU !== LAB.creds.vcenterUser || state.vcLoginP !== LAB.creds.vcenterPass) {
      state.vcError = "Invalid credentials. Use migrate-svc@vsphere.local / VMware@123";
      render();
      return;
    }
    state.vcAuthed = true;
    mark("login-vc", 15);
  }

  function ovfNext() {
    if (state.ovfStep === 6 && state.ovf.network.includes("Isolated")) {
      toast("Choose VM-Network so the appliance can reach Azure.", "err");
      return;
    }
    if (state.ovfStep === 1 && state.ovf.name.trim() !== "AzureMigrateAppl") {
      toast("Name the VM AzureMigrateAppl.", "err");
      return;
    }
    if (state.ovfStep < 7) {
      state.ovfStep += 1;
      render();
      return;
    }
    state.ovfDeployed = true;
    mark("deploy-ovf", 25);
  }

  function runChecks() {
    state.checks = { net: "run", time: "idle", urls: "idle" };
    render();
    setTimeout(() => {
      state.checks.net = "ok";
      state.checks.time = "run";
      render();
    }, 700);
    setTimeout(() => {
      state.checks.time = "ok";
      state.checks.urls = "run";
      render();
    }, 1300);
    setTimeout(() => {
      state.checks.urls = "ok";
      mark("prereq", 20);
    }, 1900);
  }

  function verifyKey() {
    const k = (state.keyInput || "").trim();
    if (!state.projectKey) {
      toast("Generate the project key in the Azure portal first (module 2).", "err");
      return;
    }
    if (k.replace(/\s/g, "") !== state.projectKey) {
      toast("Key does not match the generated project key. Copy it from the Discover blade.", "err");
      return;
    }
    state.keyAccepted = true;
    state.updating = true;
    mark("paste-key", 20);
    setTimeout(() => {
      state.updating = false;
      state.updated = true;
      render();
    }, 1800);
  }

  function finishAad() {
    const code = ($("#dev-code")?.value || "").trim().toUpperCase();
    if (code !== state.deviceCode) {
      toast("Device code does not match.", "err");
      return;
    }
    state.aadPhase = "idle";
    state.registered = true;
    mark("aad-login", 25);
  }

  function saveCreds() {
    state.credName = $("#cred-name").value.trim();
    state.credUser = $("#cred-user").value.trim();
    state.credPass = $("#cred-pass").value;
    if (state.credUser !== LAB.creds.vcenterUser || state.credPass !== LAB.creds.vcenterPass) {
      toast("Use the lab vCenter service account migrate-svc@vsphere.local.", "err");
      return;
    }
    state.credsSaved = true;
    mark("vc-creds", 15);
  }

  function saveSrc() {
    state.srcFqdn = $("#src-fqdn").value.trim();
    state.srcPort = $("#src-port").value.trim();
    const ok =
      state.srcFqdn === LAB.creds.vcenter || state.srcFqdn === LAB.creds.vcenterIp;
    if (!ok || state.srcPort !== "443") {
      toast("Add vcenter.contoso.local on port 443.", "err");
      return;
    }
    state.srcSaved = true;
    mark("vc-source", 15);
  }

  function startDiscovery() {
    state.discovering = true;
    state.discProgress = 8;
    mark("start-disc", 20);
    const t = setInterval(() => {
      state.discProgress = Math.min(100, state.discProgress + 12);
        if (state.discProgress >= 100) {
        clearInterval(t);
        state.discovered = true;
        if (!state.done["review-disc:see-vms"]) {
          state.done["review-disc:see-vms"] = true;
          award(15, "4 VMware servers discovered");
        }
      }
      render();
    }, 450);
  }

  function createAssessment() {
    state.assessName = $("#assess-name")?.value.trim() || state.assessName;
    state.groupName = $("#group-name")?.value.trim() || state.groupName;
    state.assessTarget = $("#assess-tgt")?.value || state.assessTarget;
    state.assessSizing = $("#assess-size")?.value || state.assessSizing;
    if (state.assessName !== "Assess-Contoso-Wave1") {
      toast("Name the assessment Assess-Contoso-Wave1.", "err");
      return;
    }
    if (state.groupName !== "Wave1-VMware") {
      toast("Create group Wave1-VMware.", "err");
      return;
    }
    if (!state.selectedForAssess.web01) {
      toast("WEB-01 must be in the assessment group.", "err");
      return;
    }
    if (!state.discovered) {
      toast("Discover servers before assessing.", "err");
      return;
    }
    state.assessmentReady = true;
    state.assessOpen = false;
    mark("group", 15);
    mark("run", 20);
  }

  function replNext() {
    if (state.replPhase === "source") {
      state.replPhase = "vms";
      render();
      return;
    }
    if (state.replPhase === "vms") {
      if (!state.replVm.web01) {
        toast("Select WEB-01.", "err");
        return;
      }
      state.replPhase = "target";
      render();
      return;
    }
    state.replRg = $("#repl-rg")?.value || state.replRg;
    if (state.replRg !== LAB.creds.rgName) {
      toast("Target RG must be rg-migrate-prod.", "err");
      return;
    }
    if (!state.vddk || !state.registered) {
      toast("Appliance must be registered and VDDK installed.", "err");
      return;
    }
    state.replOpen = false;
    state.replicating = true;
    state.replPct = 5;
    state.portalView = "replicate";
    mark("pick-web", 20);
    const t = setInterval(() => {
      state.replPct = Math.min(100, state.replPct + 7);
      if (state.replPct >= 100) {
        clearInterval(t);
        state.protected = true;
        state.replicating = false;
        mark("rep-ok", 25);
      } else render();
    }, 400);
    render();
  }

  function runTest() {
    state.testVnet = $("#test-vnet")?.value || state.testVnet;
    if (state.testVnet !== "vnet-test-eus") {
      toast("Use the isolated test VNet vnet-test-eus.", "err");
      return;
    }
    if (!state.protected) {
      toast("WEB-01 must be Protected first.", "err");
      return;
    }
    state.testing = true;
    state.testPct = 10;
    mark("test-start", 15);
    const t = setInterval(() => {
      state.testPct = Math.min(100, state.testPct + 15);
      if (state.testPct >= 100) {
        clearInterval(t);
        state.testing = false;
        state.testOpen = false;
        state.testRunning = true;
        mark("test-validate", 20);
      } else render();
    }, 400);
    render();
  }

  function runCutover() {
    if (state.shutdown !== "yes") {
      toast("For this lab choose planned migration with shutdown (no data loss).", "err");
      return;
    }
    if (!state.protected) {
      toast("Replication is not Protected.", "err");
      return;
    }
    state.migrating = true;
    state.migPct = 5;
    const t = setInterval(() => {
      state.migPct = Math.min(100, state.migPct + 8);
      if (state.migPct >= 100) {
        clearInterval(t);
        state.migrating = false;
        state.cutOpen = false;
        state.migrated = true;
        mark("migrate", 30);
        mark("verify", 15);
      } else render();
    }, 380);
    render();
  }

  function submitQuiz() {
    let ok = 0;
    QUIZ.forEach((q, i) => {
      if (state.quizSel[i] === q.a) ok += 1;
    });
    state.quizSubmitted = true;
    state.quizScore = Math.round((ok / QUIZ.length) * 100);
    if (state.quizScore >= 70) {
      award(40, "Knowledge check passed");
      mark("quiz-pass", 10);
    } else toast("Score below 70%. Review answers.", "err");
    render();
  }

  function instructorComplete() {
    const s = STEPS[state.step];
    s.tasks.forEach((t) => {
      const key = `${s.id}:${t.id}`;
      if (!state.done[key]) state.done[key] = true;
    });
    // seed state so later modules are usable
    if (s.id === "signin") state.azureAuthed = true;
    if (s.id === "create-project") {
      state.projectCreated = true;
      state.portalView = "migrate";
    }
    if (s.id === "discover-key") {
      state.projectKey = generateKey(LAB.creds.applianceName);
      state.keyGenPhase = "ready";
      state.ovaDownloaded = true;
    }
    if (s.id === "vsphere-ova") {
      state.vcAuthed = true;
      state.ovfDeployed = true;
      state.poweredOn = true;
    }
    if (s.id === "appl-register") {
      state.checks = { net: "ok", time: "ok", urls: "ok" };
      state.keyAccepted = true;
      state.updated = true;
      state.registered = true;
      state.vddk = true;
      if (!state.projectKey) state.projectKey = generateKey(LAB.creds.applianceName);
      state.keyInput = state.projectKey;
    }
    if (s.id === "appl-discover") {
      state.credsSaved = true;
      state.srcSaved = true;
      state.discovering = true;
      state.discovered = true;
      state.discProgress = 100;
    }
    if (s.id === "review-disc") {
      state.discovered = true;
      state.selectedVm = "web01";
    }
    if (s.id === "assess") state.assessmentReady = true;
    if (s.id === "replicate") {
      state.protected = true;
      state.replPct = 100;
    }
    if (s.id === "test-mig") {
      state.testCleaned = true;
      state.testRunning = false;
    }
    if (s.id === "cutover") {
      state.migrated = true;
      state.stoppedRep = true;
    }
    if (s.id === "quiz") {
      state.quizSubmitted = true;
      state.quizScore = 80;
    }
    if (s.id === "complete") {
      /* noop */
    }
    toast("Instructor: module marked complete", "ok");
    render();
  }

  // clock
  setInterval(() => {
    if (state.screen === "lab" && state.startedAt) {
      const el = document.querySelector(".lab-bar .stat strong");
      if (el) el.textContent = elapsed();
    }
  }, 1000);

  render();
})();
