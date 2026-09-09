import { useState } from "react";
import type { ReactNode } from "react";
import {
  RiBrainLine,
  RiCameraLine,
  RiCloseLine,
  RiCommandLine,
  RiComputerLine,
  RiFileTextLine,
  RiFolderOpenLine,
  RiGlobalLine,
  RiImageLine,
  RiMenuLine,
  RiMicLine,
  RiMore2Line,
  RiPulseLine,
  RiRobot2Line,
  RiSearchLine,
  RiSendPlane2Line,
  RiSettings4Line,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiTaskLine,
} from "react-icons/ri";
import "./phantom-nexus.css";

type View =
  | "home"
  | "chat"
  | "automations"
  | "devices"
  | "settings"
  | "agents"
  | "tasks"
  | "system"
  | "vision"
  | "files"
  | "accessibility";
type Icon = typeof RiBrainLine;
const capabilities: { label: string; icon: Icon; pos: string }[] = [
  { label: "THINK", icon: RiBrainLine, pos: "north" },
  { label: "EXECUTE", icon: RiCommandLine, pos: "north-east" },
  { label: "SEARCH", icon: RiSearchLine, pos: "east" },
  { label: "AUTOMATE", icon: RiPulseLine, pos: "south-east" },
  { label: "ANALYZE", icon: RiPulseLine, pos: "south-west" },
  { label: "LEARN", icon: RiSparkling2Line, pos: "west" },
];
const menu: { label: string; view: View; icon: Icon }[] = [
  { label: "Home", view: "home", icon: RiCommandLine },
  { label: "Console", view: "chat", icon: RiBrainLine },
  { label: "Tasks", view: "tasks", icon: RiTaskLine },
  { label: "Agents", view: "agents", icon: RiRobot2Line },
  { label: "Memory", view: "chat", icon: RiBrainLine },
  { label: "Files", view: "files", icon: RiFolderOpenLine },
  { label: "Browser", view: "chat", icon: RiGlobalLine },
  { label: "Vision", view: "vision", icon: RiCameraLine },
  { label: "Automations", view: "automations", icon: RiPulseLine },
  { label: "Devices", view: "devices", icon: RiComputerLine },
  { label: "Settings", view: "settings", icon: RiSettings4Line },
  { label: "Developer", view: "system", icon: RiCommandLine },
];

export default function PhantomNexus() {
  const [view, setView] = useState<View>("home");
  const [drawer, setDrawer] = useState(false);
  const [voice, setVoice] = useState("IDLE");
  return (
    <main className="pn-app">
      <div className="pn-stars" />
      <Header
        onMenu={() => setDrawer(true)}
        onSettings={() => setView("settings")}
      />
      <Drawer open={drawer} close={() => setDrawer(false)} navigate={setView} />
      <section className="pn-page">
        {view === "home" ? (
          <Home voice={voice} setVoice={setVoice} />
        ) : (
          <Screen view={view} />
        )}
      </section>
      <BottomNav view={view} setView={setView} />
    </main>
  );
}
function Header({
  onMenu,
  onSettings,
}: {
  onMenu: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="pn-header">
      <button aria-label="Open menu" onClick={onMenu}>
        <RiMenuLine />
      </button>
      <div className="pn-brand">
        <b>M</b>
        <span>
          <strong>MAX</strong>
          <small>
            PHANTOM NEXUS <i /> AI OS LAYER
          </small>
        </span>
      </div>
      <div className="pn-head-right">
        <em>
          <i />
          ONLINE
        </em>
        <button aria-label="Open settings" onClick={onSettings}>
          <RiSettings4Line />
        </button>
      </div>
    </header>
  );
}
function Home({
  voice,
  setVoice,
}: {
  voice: string;
  setVoice: (x: string) => void;
}) {
  return (
    <>
      <section className="pn-greeting">
        <p>
          GOOD EVENING, <span>BOSS.</span>
        </p>
        <h1>
          I&apos;m <b>MAX</b>
        </h1>
        <div>
          Your personal AI operating system.
          <br />
          Ready to understand, assist and execute.
        </div>
      </section>
      <QuickActions />
      <Planet />
      <div className="pn-home-grid">
        <Card title="TASK TIMELINE">
          <Empty
            icon={<RiTaskLine />}
            title="No recent activity"
            detail="Tasks will appear here when MAX begins work."
          />
        </Card>
        <Card title="QUICK CONSOLE">
          <Empty
            icon={<RiBrainLine />}
            title="MAX"
            detail="Ready when you are."
          />
        </Card>
        <Card title="LIVE INFORMATION" className="pn-live">
          {["NEWS", "WEATHER", "LOCATION"].map((x) => (
            <div key={x}>
              <small>{x}</small>
              <span>Waiting for live data...</span>
            </div>
          ))}
        </Card>
      </div>
      <VoicePanel voice={voice} setVoice={setVoice} />
      <CommandBar />
    </>
  );
}
function QuickActions() {
  const items: [string, Icon][] = [
    ["SCHEDULE", RiTaskLine],
    ["ANALYZE", RiPulseLine],
    ["RESEARCH", RiSearchLine],
    ["SYSTEM", RiComputerLine],
  ];
  return (
    <div className="pn-actions">
      {items.map(([label, Icon]) => (
        <button key={label}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
function Planet() {
  return (
    <section className="pn-orbit" aria-label="MAX CORE capability system">
      <div className="pn-ring r-one" />
      <div className="pn-ring r-two" />
      <div className="pn-ring r-three" />
      <svg viewBox="0 0 400 400" className="pn-links" aria-hidden="true">
        {[
          [200, 200, 200, 52],
          [200, 200, 336, 114],
          [200, 200, 346, 250],
          [200, 200, 270, 342],
          [200, 200, 116, 342],
          [200, 200, 54, 224],
        ].map((l, i) => (
          <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />
        ))}
      </svg>
      <div className="pn-planet">
        <div className="pn-surface" />
        <div className="pn-cloud one" />
        <div className="pn-cloud two" />
        <div className="pn-lights" />
        <div className="pn-planet-label">
          <b>MAX CORE</b>
          <span>NEURAL ORBIT ONLINE</span>
        </div>
      </div>
      {capabilities.map(({ label, icon: Icon, pos }) => (
        <div className={`pn-cap ${pos}`} key={label}>
          <Icon />
          <span>{label}</span>
        </div>
      ))}
      <div className="pn-core-status">
        <i /> MAX CORE ACTIVE <i />
      </div>
    </section>
  );
}
function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pn-card ${className}`}>
      <header>
        <b>{title}</b>
        <RiMore2Line />
      </header>
      {children}
    </section>
  );
}
function Empty({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="pn-empty">
      <i>{icon}</i>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
function VoicePanel({
  voice,
  setVoice,
}: {
  voice: string;
  setVoice: (x: string) => void;
}) {
  const states = [
    "IDLE",
    "LISTENING",
    "THINKING",
    "EXECUTING",
    "SPEAKING",
    "ERROR",
    "OFFLINE",
  ];
  return (
    <Card title="VOICE ACTIVE" className="pn-voice">
      <div className="pn-state-picker">
        {states.map((x) => (
          <button
            className={voice === x ? "active" : ""}
            key={x}
            onClick={() => setVoice(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="pn-voice-core">
        <i className="a" />
        <i className="b" />
        <div>
          <RiMicLine />
          <b>MAX</b>
        </div>
        <span>▁▃▆▃▂▅▇▅▂▃▆▃▁</span>
      </div>
      <strong>MAX VOICE CORE</strong>
      <p>{voice === "IDLE" ? "Tap to speak" : `${voice} — visual preview`}</p>
    </Card>
  );
}
function CommandBar() {
  return (
    <form className="pn-command" onSubmit={(e) => e.preventDefault()}>
      <RiSparkling2Line />
      <input placeholder="Ask MAX..." aria-label="Ask MAX" />
      <button aria-label="Send command">
        <RiSendPlane2Line />
      </button>
    </form>
  );
}
function BottomNav({
  view,
  setView,
}: {
  view: View;
  setView: (x: View) => void;
}) {
  const n: [View, string, Icon][] = [
    ["home", "HOME", RiCommandLine],
    ["chat", "CHAT", RiBrainLine],
    ["automations", "AUTO", RiPulseLine],
    ["devices", "DEVICES", RiComputerLine],
    ["settings", "SETTINGS", RiSettings4Line],
  ];
  return (
    <nav className="pn-bottom">
      {n.map(([id, label, Icon]) => (
        <button
          onClick={() => setView(id)}
          className={view === id ? "active" : ""}
          key={id}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
function Drawer({
  open,
  close,
  navigate,
}: {
  open: boolean;
  close: () => void;
  navigate: (x: View) => void;
}) {
  return (
    <>
      <button
        className={`pn-scrim ${open ? "show" : ""}`}
        onClick={close}
        aria-label="Close menu"
      />
      <aside className={`pn-drawer ${open ? "show" : ""}`}>
        <header>
          <div className="pn-brand">
            <b>M</b>
            <span>
              <strong>MAX</strong>
              <small>
                PHANTOM NEXUS
                <br />
                AI OS LAYER
              </small>
            </span>
          </div>
          <button onClick={close}>
            <RiCloseLine />
          </button>
        </header>
        <nav>
          {menu.map(({ label, view, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                navigate(view);
                close();
              }}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <footer>
          <b>MAX</b>
          <span>
            <i /> All Systems Operational
          </span>
        </footer>
      </aside>
    </>
  );
}
function Screen({ view }: { view: View }) {
  if (view === "agents")
    return (
      <Shell eye="AGENT NETWORK" title="Agents">
        <div className="pn-agent-grid">
          {[
            "Planner",
            "Voice",
            "Vision",
            "Browser",
            "File",
            "System",
            "Research",
            "Memory",
            "Automation",
          ].map((x, i) => (
            <article key={x}>
              <i>{i % 2 ? <RiSparkling2Line /> : <RiRobot2Line />}</i>
              <small>{i === 1 || i === 2 ? "NOT CONFIGURED" : "READY"}</small>
              <b>{x} Agent</b>
              <p>
                {x === "Planner"
                  ? "Plans and breaks down complex tasks."
                  : "Ready for configuration when enabled."}
              </p>
            </article>
          ))}
        </div>
      </Shell>
    );
  if (view === "tasks")
    return (
      <Shell eye="TASK MANAGEMENT" title="Active Tasks">
        <div className="pn-tabs">
          <button className="active">ACTIVE</button>
          <button>QUEUED</button>
          <button>HISTORY</button>
        </div>
        <Empty
          icon={<RiTaskLine />}
          title="No active tasks."
          detail="MAX will surface real work here when it begins."
        />
      </Shell>
    );
  if (view === "settings") return <Settings />;
  if (view === "vision")
    return (
      <Shell eye="VISUAL INTELLIGENCE" title="MAX Vision">
        <div className="pn-vision">
          {[
            ["SCREEN", RiComputerLine],
            ["CAMERA", RiCameraLine],
            ["IMAGE", RiImageLine],
            ["PDF", RiFileTextLine],
          ].map(([x, Icon]) => {
            const I = Icon as Icon;
            return (
              <button key={String(x)}>
                <I />
                <b>{x}</b>
                <span>Capture · Analyze · History</span>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  if (view === "files")
    return (
      <Shell eye="LOCAL STORAGE" title="MAX File Manager">
        <div className="pn-file-tools">
          <button>
            <RiSearchLine /> Search
          </button>
          <button>Sort</button>
          <button>Recent</button>
        </div>
        <div className="pn-categories">
          {["Images", "Videos", "Documents", "Downloads", "Audio", "Other"].map(
            (x) => (
              <button key={x}>
                <RiFolderOpenLine />
                {x}
              </button>
            ),
          )}
        </div>
        <Empty
          icon={<RiFolderOpenLine />}
          title="No files indexed."
          detail="File data will appear after a future connection is configured."
        />
      </Shell>
    );
  if (view === "automations")
    return (
      <Shell eye="WORKFLOW LAYER" title="Automations">
        <div className="pn-list">
          {["Morning Briefing", "Battery Alert", "Daily Reminder"].map((x) => (
            <article key={x}>
              <RiPulseLine />
              <span>
                <b>{x}</b>
                <small>Demo / Not Configured</small>
              </span>
            </article>
          ))}
        </div>
      </Shell>
    );
  if (view === "devices" || view === "system")
    return (
      <Shell
        eye="SYSTEM OVERVIEW"
        title={view === "devices" ? "Devices" : "System"}
      >
        <div className="pn-system">
          {[
            "CPU",
            "RAM",
            "GPU",
            "Storage",
            "Battery",
            "Network",
            "Temperature",
          ].map((x) => (
            <article key={x}>
              <small>{x}</small>
              <b>-- %</b>
              <span>Waiting for system data</span>
            </article>
          ))}
        </div>
      </Shell>
    );
  if (view === "accessibility")
    return (
      <Shell eye="DEVICE INTERFACE" title="MAX Accessibility">
        <div className="pn-access">
          <RiShieldCheckLine />
          <span>
            <small>ACCESSIBILITY SERVICE</small>
            <b>OFF</b>
            <p>
              Allows MAX to understand and interact with supported UI elements
              on your device.
            </p>
            <button>Enable in Android Settings</button>
          </span>
        </div>
      </Shell>
    );
  return (
    <Shell eye="MAX CONSOLE" title="Console">
      <Empty
        icon={<RiBrainLine />}
        title="No recent conversations."
        detail="This interface is ready for a future connection."
      />
    </Shell>
  );
}
function Shell({
  eye,
  title,
  children,
}: {
  eye: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pn-shell">
      <p>{eye}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
function Settings() {
  const sections = [
    "PROFILE",
    "VOICE",
    "AI PROVIDERS",
    "VISION",
    "ACCESSIBILITY",
    "FILES",
    "NOTIFICATIONS",
    "LOCATION",
    "AUTOMATIONS",
    "MEMORY",
    "DEVICES",
    "SECURITY",
    "DEVELOPER",
  ];
  return (
    <Shell eye="NEXUS CONFIGURATION" title="Settings">
      <div className="pn-settings">
        {sections.map((x) => (
          <button key={x}>
            {x}
            <span>›</span>
          </button>
        ))}
      </div>
      <h2>AI PROVIDERS</h2>
      <div className="pn-providers">
        {["Gemini", "Grok", "OpenRouter", "NVIDIA", "OpenAI"].map((x) => (
          <article key={x}>
            <span>
              <b>{x}</b>
              <small>Not configured · Model —</small>
            </span>
            <code>••••••••••</code>
            <button>Configure</button>
          </article>
        ))}
      </div>
    </Shell>
  );
}
