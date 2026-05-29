"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const ACCENT = "#1D9E75";
const AUTH_KEY = "vaidy_auth_state";

const user = {
  name: "Ananya Rao",
  email: "ananya@example.com",
  phone: "+91 98765 43210",
  city: "Bengaluru",
  bloodGroup: "B+",
  healthScore: 78,
};

const reports = [
  {
    name: "Complete Blood Count",
    lab: "Apollo Diagnostics",
    date: "15 Jan 2024",
    type: "CBC",
    doctor: "Dr. Meera Iyer",
    status: "Needs Attention",
    initials: "AD",
    color: "#1D9E75",
  },
  {
    name: "Lipid Panel",
    lab: "Thyrocare",
    date: "20 Mar 2024",
    type: "Lipid Panel",
    doctor: "Dr. Nikhil Rao",
    status: "Normal",
    initials: "TC",
    color: "#3B82F6",
  },
  {
    name: "Thyroid (TSH/T3/T4)",
    lab: "Lal Path Labs",
    date: "5 May 2024",
    type: "Thyroid",
    doctor: "Dr. Kavya Menon",
    status: "Normal",
    initials: "LP",
    color: "#8B5CF6",
  },
  {
    name: "HbA1c Test",
    lab: "Dr. Lal PathLabs",
    date: "10 Jun 2024",
    type: "HbA1c",
    doctor: "Dr. Rohan Shah",
    status: "Normal",
    initials: "DL",
    color: "#F97316",
  },
  {
    name: "Vitamin D & B12",
    lab: "Apollo Diagnostics",
    date: "22 Aug 2024",
    type: "Vitamin Panel",
    doctor: "Dr. Meera Iyer",
    status: "Needs Attention",
    initials: "AD",
    color: "#1D9E75",
  },
  {
    name: "Follow-up CBC",
    lab: "Thyrocare",
    date: "1 Nov 2024",
    type: "CBC",
    doctor: "Dr. Nikhil Rao",
    status: "Normal",
    initials: "TC",
    color: "#3B82F6",
  },
];

const biomarkers = [
  ["Hemoglobin", "12.4", "g/dL", "12.0 - 15.5", "Normal"],
  ["Vitamin D", "18", "ng/mL", "30 - 100", "Low"],
  ["Ferritin", "42", "ng/mL", "15 - 150", "Normal"],
  ["HbA1c", "5.4", "%", "< 5.7", "Normal"],
  ["TSH", "2.1", "mIU/L", "0.4 - 4.0", "Normal"],
];

type IconName =
  | "home"
  | "file"
  | "timeline"
  | "chat"
  | "settings"
  | "logout"
  | "bell"
  | "eye"
  | "download"
  | "share"
  | "trash"
  | "upload"
  | "sparkle"
  | "mail"
  | "check";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="M3 10.8 12 3l9 7.8v8.7a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5Z" />,
    file: <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8Zm0 0v5h5M8 13h8M8 17h5" />,
    timeline: <path d="M5 4v16M5 7h6a3 3 0 1 1 0 6H8a3 3 0 1 0 0 6h11" />,
    chat: <path d="M21 11.5a8.5 8.5 0 0 1-9.7 8.4L4 21l1.5-5.1A8.5 8.5 0 1 1 21 11.5Z" />,
    settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a7.8 7.8 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.1L15.2 3h-4l-.4 2.8a8 8 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.1l.4 2.8h4l.4-2.8a8 8 0 0 0 2-1.1l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />,
    logout: <path d="M10 17 15 12l-5-5M15 12H3M10 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-8" />,
    bell: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    eye: <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />,
    share: <path d="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 2.8 4M8.7 9.5l6.6-3M8.7 14.5l6.6 3" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
    upload: <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />,
    mail: <path d="M4 6h16v12H4Zm0 0 8 7 8-7" />,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="inline-flex items-baseline text-[22px] font-bold tracking-[-0.02em] text-white">
      vaidy<span className="ml-0.5 text-[#1D9E75]">.</span>
    </Link>
  );
}

function GoogleButton() {
  return (
    <button type="button" className="auth-google-btn" aria-label="Continue with Google">
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.7 3.3-8Z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1V17A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.4V7H2.1a11 11 0 0 0 0 10Z" />
        <path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0 0 12 1 11 11 0 0 0 2.1 7l3.7 2.8c.9-2.6 3.3-4.5 6.2-4.5Z" />
      </svg>
      Continue with Google
    </button>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-bg min-h-screen px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Link href="/signin" className="hidden text-sm font-medium text-[#888] transition hover:text-white sm:inline">
            Sign in
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
    </main>
  );
}

function Field({
  label,
  rightSlot,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  valid,
  children,
}: {
  label?: string;
  rightSlot?: ReactNode;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  valid?: boolean;
  children?: ReactNode;
}) {
  const fieldId = useId();
  return (
    <div className="block">
      {label || rightSlot ? (
        <span className="mb-2 flex items-center justify-between gap-3">
          {label ? <label htmlFor={fieldId} className="text-sm font-medium text-[#ccc]">{label}</label> : <span />}
          {rightSlot}
        </span>
      ) : null}
      <span className={`auth-input-wrap ${error ? "is-error" : ""} ${valid ? "is-valid" : ""}`}>
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="auth-input"
          aria-invalid={Boolean(error)}
        />
        {valid ? <Icon name="check" className="h-4 w-4 text-[#1D9E75]" /> : null}
        {children}
      </span>
      {error ? <span className="mt-1.5 block text-xs text-[#ff6b6b]">{error}</span> : null}
    </div>
  );
}

function PasswordField({
  label,
  rightSlot,
  value,
  onChange,
  placeholder = "Enter password",
  error,
  valid,
}: {
  label?: string;
  rightSlot?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  valid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      rightSlot={rightSlot}
      type={visible ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      error={error}
      valid={valid}
    >
      <button
        type="button"
        onClick={() => setVisible((next) => !next)}
        className="rounded-md p-1 text-[#888] transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/60"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon name="eye" className="h-4 w-4" />
      </button>
    </Field>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-[#888]">
      <span className="h-px flex-1 bg-white/[0.08]" />
      or continue with
      <span className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

function signInAndRedirect(router: ReturnType<typeof useRouter>, destination = "/dashboard") {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify({ signedIn: true, email: user.email, at: Date.now() }));
  router.push(destination);
}

export function SignUpPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "Male",
    city: "",
    password: "",
    confirm: "",
    terms: false,
  });

  const strength = form.confirm.length > 9 ? "Strong" : form.confirm.length > 5 ? "Fair" : "Weak";
  const passwordMatch = form.confirm.length > 0 && form.password === form.confirm;
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const required = (value: string) => submitted && !value.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name || !form.email || !form.phone || !form.dob || !form.city || !form.password || !passwordMatch || !form.terms) return;
    signInAndRedirect(router, "/verify-email");
  }

  return (
    <AuthShell>
      <section className="auth-card w-full max-w-[440px]">
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-white">Create your health account</h1>
        <p className="mt-2 text-sm leading-6 text-[#888]">Join 10,000+ Indians tracking their health with AI</p>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <Field label="Full Name" placeholder="Dr. Rahul Sharma" value={form.name} onChange={(v) => update("name", v)} error={required(form.name) ? "Full name is required" : undefined} valid={form.name.length > 2} />
          <Field label="Email Address" type="email" placeholder="rahul@example.com" value={form.email} onChange={(v) => update("email", v)} error={required(form.email) ? "Email address is required" : undefined} valid={form.email.includes("@")} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Phone Number</span>
            <span className={`auth-input-wrap ${required(form.phone) ? "is-error" : ""} ${form.phone.length > 8 ? "is-valid" : ""}`}>
              <span className="select-none border-r border-white/[0.08] pr-3 text-sm font-semibold text-white">+91</span>
              <input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="98765 43210" className="auth-input" inputMode="tel" />
              {form.phone.length > 8 ? <Icon name="check" className="h-4 w-4 text-[#1D9E75]" /> : null}
            </span>
            {required(form.phone) ? <span className="mt-1.5 block text-xs text-[#ff6b6b]">Phone number is required</span> : null}
          </label>
          <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => update("dob", v)} error={required(form.dob) ? "Date of birth is required" : undefined} valid={Boolean(form.dob)} />

          <div>
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Gender</span>
            <div className="grid grid-cols-3 rounded-lg border border-white/[0.08] bg-[#0d0d0d] p-1">
              {["Male", "Female", "Other"].map((gender) => (
                <button
                  type="button"
                  key={gender}
                  onClick={() => update("gender", gender)}
                  className={`h-10 rounded-md text-sm font-semibold transition ${form.gender === gender ? "bg-[#1D9E75] text-white" : "text-[#888] hover:text-white"}`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <Field label="City" placeholder="Delhi, Mumbai, Bengaluru..." value={form.city} onChange={(v) => update("city", v)} error={required(form.city) ? "City is required" : undefined} valid={form.city.length > 2} />
          <PasswordField label="Password" value={form.password} onChange={(v) => update("password", v)} error={required(form.password) ? "Password is required" : undefined} valid={form.password.length > 5} />
          <div>
            <PasswordField label="Confirm Password" value={form.confirm} onChange={(v) => update("confirm", v)} error={submitted && !passwordMatch ? "Passwords must match" : undefined} valid={passwordMatch} />
            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <span className={`block h-full rounded-full ${strength === "Strong" ? "w-full bg-[#1D9E75]" : strength === "Fair" ? "w-2/3 bg-[#f6b84b]" : "w-1/3 bg-[#ff6b6b]"}`} />
              </span>
              <span className="w-12 text-right text-xs text-[#888]">{strength}</span>
            </div>
            <p className={`mt-1 text-xs ${passwordMatch ? "text-[#1D9E75]" : "text-[#888]"}`}>
              {form.confirm ? (passwordMatch ? "Passwords match" : "Passwords do not match yet") : "Confirm password to check match"}
            </p>
          </div>

          <label className="flex gap-3 text-sm leading-5 text-[#888]">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(event) => update("terms", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/[0.12] bg-[#111] accent-[#1D9E75]"
            />
            <span>
              I agree to the <Link href="/privacy" className="text-[#1D9E75]">Privacy Policy</Link> and <Link href="/terms" className="text-[#1D9E75]">Terms of Service</Link>
            </span>
          </label>
          {submitted && !form.terms ? <p className="-mt-2 text-xs text-[#ff6b6b]">Please accept the terms to continue</p> : null}

          <button type="submit" className="auth-primary-btn">Create Account &rarr;</button>
        </form>

        <AuthDivider />
        <GoogleButton />
        <p className="mt-6 text-center text-sm text-[#888]">
          Already have an account? <Link href="/signin" className="font-semibold text-[#1D9E75]">Sign in</Link>
        </p>
      </section>
    </AuthShell>
  );
}

export function SignInPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!email || !password) return;
    signInAndRedirect(router);
  }

  return (
    <AuthShell>
      <section className="auth-card w-full max-w-[440px]">
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-white">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-[#888]">Sign in to your Vaidy account</p>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <Field label="Email Address" type="email" placeholder="ananya@example.com" value={email} onChange={setEmail} error={submitted && !email ? "Email address is required" : undefined} valid={email.includes("@")} />
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            error={submitted && !password ? "Password is required" : undefined}
            valid={password.length > 5}
            rightSlot={<Link href="/verify-email" className="text-sm font-medium text-[#1D9E75] hover:text-white">Forgot password?</Link>}
          />
          <button type="submit" className="auth-primary-btn">Sign In &rarr;</button>
        </form>

        <AuthDivider />
        <GoogleButton />
        <p className="mt-6 text-center text-sm text-[#888]">
          Don&apos;t have an account? <Link href="/signup" className="font-semibold text-[#1D9E75]">Sign up</Link>
        </p>
      </section>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const router = useRouter();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(45);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const filled = digits.every(Boolean);

  function changeDigit(index: number, value: string) {
    const next = [...digits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setDigits(next);
    if (next[index] && index < 5) inputs.current[index + 1]?.focus();
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  }

  return (
    <AuthShell>
      <section className="auth-card w-full max-w-[440px] text-center">
        <div className="mx-auto flex h-20 w-20 animate-[mailFloat_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#1D9E75]/15 text-[#1D9E75] ring-1 ring-[#1D9E75]/25">
          <Icon name="mail" className="h-9 w-9" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.01em] text-white">Check your inbox</h1>
        <p className="mt-2 text-sm leading-6 text-[#888]">We sent a 6-digit code to rahul@example.com</p>

        <div className="mt-8 flex justify-center gap-2 sm:gap-3" aria-label="6 digit verification code">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              onChange={(event) => changeDigit(index, event.target.value)}
              onKeyDown={(event) => keyDown(index, event)}
              inputMode="numeric"
              className={`h-16 w-[46px] rounded-lg border bg-[#0d0d0d] text-center text-2xl font-bold text-white outline-none transition sm:w-[52px] ${digit ? "border-[#1D9E75] text-[#1D9E75]" : "border-white/[0.08] focus:border-white"}`}
              aria-label={`Digit ${index + 1}`}
              maxLength={1}
            />
          ))}
        </div>

        <div className="mt-6 text-sm text-[#888]">
          {seconds > 0 ? (
            <>Resend code in 0:{String(seconds).padStart(2, "0")}</>
          ) : (
            <button type="button" onClick={() => setSeconds(45)} className="font-semibold text-[#1D9E75] hover:text-white">
              Resend code
            </button>
          )}
        </div>

        <button type="button" disabled={!filled} onClick={() => router.push("/setup-profile")} className="auth-primary-btn mt-6 disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-[#888] disabled:shadow-none">
          Verify Email &rarr;
        </button>
        <Link href="/signin" className="mt-5 inline-flex text-sm font-medium text-[#888] transition hover:text-white">
          &larr; Back to sign in
        </Link>
      </section>
    </AuthShell>
  );
}

export function SetupProfilePage() {
  const router = useRouter();
  const [conditions, setConditions] = useState(["None"]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [allergies, setAllergies] = useState("");

  function toggleCondition(condition: string) {
    setConditions((current) => {
      if (condition === "None") return ["None"];
      const filtered = current.filter((item) => item !== "None");
      return filtered.includes(condition) ? filtered.filter((item) => item !== condition) : [...filtered, condition];
    });
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setAvatar(URL.createObjectURL(file));
  }

  return (
    <AuthShell>
      <section className="auth-card w-full max-w-[560px]">
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-[#888]">
            <span>Step 3 of 3</span>
            <span>Account &rarr; Verify &rarr; Profile</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((step) => <span key={step} className="h-1.5 rounded-full bg-[#1D9E75]" />)}
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-white">Almost there! Set up your health profile</h1>
        <p className="mt-2 text-sm leading-6 text-[#888]">This helps Vaidy give you personalized health insights</p>

        <form
          className="mt-7 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            signInAndRedirect(router);
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Blood Group</span>
            <select className="auth-select" defaultValue="B+">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group}>{group}</option>)}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Known Conditions</span>
            <div className="flex flex-wrap gap-2">
              {["Diabetes", "Hypertension", "Thyroid", "Heart", "None", "Other"].map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => toggleCondition(condition)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${conditions.includes(condition) ? "border-[#1D9E75] bg-[#1D9E75]/15 text-white" : "border-white/[0.08] bg-[#111] text-[#888] hover:text-white"}`}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>

          <Field label="Allergies" placeholder="Peanuts, penicillin..." value={allergies} onChange={setAllergies} valid={allergies.length > 2} />

          <div>
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Primary Language</span>
            <div className="grid max-w-xs grid-cols-2 rounded-lg border border-white/[0.08] bg-[#0d0d0d] p-1">
              <button type="button" className="h-10 rounded-md bg-[#1D9E75] text-sm font-semibold text-white">English</button>
              <button type="button" className="h-10 rounded-md text-sm font-semibold text-[#888] transition hover:text-white">हिन्दी</button>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#ccc]">Avatar/Profile photo</span>
            <span className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-white/[0.12] bg-[#0d0d0d] p-4 transition hover:border-[#1D9E75]">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#1D9E75]/15 text-lg font-bold text-[#1D9E75]">
                {avatar ? <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" /> : "AR"}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">Upload profile photo</span>
                <span className="mt-1 block text-xs text-[#888]">PNG or JPG, square works best</span>
              </span>
              <input type="file" accept="image/*" onChange={upload} className="sr-only" />
            </span>
          </label>

          <button type="submit" className="auth-primary-btn">Complete Setup &rarr;</button>
          <button type="button" onClick={() => signInAndRedirect(router)} className="block w-full text-center text-sm font-medium text-[#888] transition hover:text-white">
            Skip for now
          </button>
        </form>
      </section>
    </AuthShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Critical"
      ? "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ff8b8b]"
      : status === "Needs Attention" || status === "Low"
        ? "border-[#f6b84b]/30 bg-[#f6b84b]/10 text-[#ffd27a]"
        : "border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#72ddb9]";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav: Array<{ label: string; href: string; icon: IconName }> = [
    { label: "Overview", href: "/dashboard", icon: "home" },
    { label: "My Reports", href: "/dashboard/reports", icon: "file" },
    { label: "Health Timeline", href: "/dashboard#timeline", icon: "timeline" },
    { label: "AI Chat", href: "/chat", icon: "chat" },
    { label: "Settings", href: "/dashboard#settings", icon: "settings" },
  ];

  function logout() {
    window.localStorage.removeItem(AUTH_KEY);
    router.push("/signin");
  }

  return (
    <main className="app-bg min-h-screen text-white">
      <aside className="dashboard-sidebar">
        <Logo />
        <div className="mt-8 flex items-center gap-3 border-b border-white/[0.08] pb-6">
          <Avatar />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-[#888]">{user.email}</p>
          </div>
        </div>
        <nav className="mt-7 space-y-1">
          {nav.map(({ label, href, icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href.split("#")[0]);
            return (
              <Link key={label} href={href} className={`dashboard-nav-item ${active ? "is-active" : ""}`}>
                <Icon name={icon} className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={logout} className="dashboard-logout">
          <Icon name="logout" className="h-5 w-5" />
          Logout
        </button>
      </aside>
      <div className="min-h-screen lg:pl-60">
        <TopBar />
        <div className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}

function Avatar({ small = false }: { small?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/15 font-bold text-[#1D9E75] ring-1 ring-[#1D9E75]/25 ${small ? "h-9 w-9 text-sm" : "h-11 w-11 text-base"}`}>
      AR
    </span>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a0a0a]/82 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-white sm:text-xl">Good morning, Ananya</p>
          <p className="mt-1 text-sm text-[#888]">Friday, 29 May 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111] text-[#ccc] transition hover:border-[#1D9E75]/50 hover:text-white" aria-label="Notifications">
            <Icon name="bell" className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#1D9E75]" />
          </button>
          <Avatar small />
        </div>
      </div>
    </header>
  );
}

export function DashboardPage() {
  const recent = reports.slice(0, 3);
  return (
    <AppShell>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Reports Analyzed", "12", "3 this month"],
          ["Health Score", "78/100", "↑ +4 from last month"],
          ["Biomarkers Tracked", "34", "across 6 report types"],
          ["Next Checkup", "In 18 days", "Recommended: Full CBC"],
        ].map(([title, value, note]) => (
          <article key={title} className="dashboard-card">
            <p className="text-sm text-[#888]">{title}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-white">{value}</h2>
            <p className={`mt-2 text-sm ${note.startsWith("↑") ? "text-[#1D9E75]" : "text-[#888]"}`}>{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="dashboard-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Recent Reports</h2>
              <Link href="/dashboard/reports" className="text-sm font-semibold text-[#1D9E75]">View all &rarr;</Link>
            </div>
            <div className="space-y-3">
              {recent.map((report) => (
                <article key={report.name} className="report-row">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: report.color }}>{report.initials}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{report.name}</h3>
                    <p className="mt-1 text-xs text-[#888]">{report.date} · {report.lab}</p>
                  </div>
                  <StatusBadge status={report.status} />
                  <Link href="/dashboard/reports" className="hidden text-sm font-semibold text-[#1D9E75] sm:inline">View Analysis &rarr;</Link>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Hemoglobin trend</h2>
                <p className="mt-1 text-sm text-[#888]">Current value <span className="font-semibold text-white">12.4 g/dL</span></p>
              </div>
              <StatusBadge status="Normal" />
            </div>
            <svg className="mt-6 h-44 w-full overflow-visible" viewBox="0 0 640 180" role="img" aria-label="Hemoglobin trend over 6 months">
              <defs>
                <linearGradient id="trend" x1="0" x2="1" y1="0" y2="0">
                  <stop stopColor="#0F6E56" />
                  <stop offset="1" stopColor="#1D9E75" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => <line key={line} x1="0" x2="640" y1={35 + line * 38} y2={35 + line * 38} stroke="rgba(255,255,255,0.06)" />)}
              <path d="M0 120 C80 112 108 96 160 104 S250 132 320 98 420 55 480 72 570 92 640 46" fill="none" stroke="url(#trend)" strokeWidth="4" strokeLinecap="round" />
              <path d="M0 120 C80 112 108 96 160 104 S250 132 320 98 420 55 480 72 570 92 640 46 L640 180 L0 180Z" fill="rgba(29,158,117,0.08)" />
              {["Jan", "Mar", "May", "Jun", "Aug", "Nov"].map((month, index) => (
                <text key={month} x={index * 125 + 8} y="174" fill="#888" fontSize="12">{month}</text>
              ))}
            </svg>
          </div>
        </div>

        <aside className="dashboard-card h-fit">
          <div className="flex items-center gap-2">
            <Icon name="sparkle" className="h-5 w-5 text-[#1D9E75]" />
            <h2 className="text-lg font-bold text-white">Vaidy&apos;s Insights</h2>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["amber", "Your Vitamin D has been low for 2 consecutive reports. Consider supplementation."],
              ["green", "HbA1c is in normal range. Keep maintaining your current diet."],
              ["teal", "Ferritin trending upward - good recovery progress."],
            ].map(([tone, text]) => (
              <div key={text} className={`insight-card ${tone}`}>
                <p className="text-sm leading-6 text-[#ccc]">{text}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function FilterPill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return <button type="button" className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${active ? "border-[#1D9E75] bg-[#1D9E75]/15 text-white" : "border-white/[0.08] bg-[#111] text-[#888] hover:text-white"}`}>{children}</button>;
}

export function ReportsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(reports[0]);

  return (
    <AppShell>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-white">My Health Reports</h1>
            <p className="mt-1 text-sm text-[#888]">Search, filter, and review your AI-analyzed reports.</p>
          </div>
          <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D9E75] px-5 text-sm font-bold text-white shadow-[0_0_28px_rgba(29,158,117,0.2)] transition hover:bg-[#0F6E56]">
            + Upload Report
          </button>
        </div>

        <div className="dashboard-card mt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
            <input className="auth-input-wrap h-11 px-4 text-sm text-white outline-none" placeholder="Search reports..." aria-label="Search reports" />
            <select className="auth-select h-11" aria-label="Filter by lab">
              {["All", "Apollo", "Thyrocare", "Lal Path Labs", "Dr. Lal", "Other"].map((lab) => <option key={lab}>{lab}</option>)}
            </select>
            <select className="auth-select h-11" aria-label="Sort by">
              {["Latest", "Oldest", "Lab Name"].map((sort) => <option key={sort}>{sort}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="auth-input-wrap h-11 px-3 text-sm text-[#ccc] outline-none" aria-label="From date" />
              <input type="date" className="auth-input-wrap h-11 px-3 text-sm text-[#ccc] outline-none" aria-label="To date" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["All", "Blood Test", "Lipid Panel", "Thyroid", "CBC", "Other"].map((type, index) => <FilterPill key={type} active={index === 0}>{type}</FilterPill>)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article key={report.name} className="report-card">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="h-3 w-3 rounded-full" style={{ background: report.color }} />
                  {report.lab}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-[#161616] px-2.5 py-1 text-xs font-semibold text-[#ccc]">{report.type}</span>
              </div>
              <div className="mt-6">
                <h2 className="text-lg font-bold text-white">{report.name}</h2>
                <p className="mt-2 text-sm text-[#888]">{report.date}</p>
                <p className="mt-1 text-sm text-[#888]">{report.doctor}</p>
              </div>
              <div className="mt-5">
                <StatusBadge status={report.status} />
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-white/[0.08] pt-4">
                {[
                  ["eye", "View Analysis"],
                  ["download", "Download PDF"],
                  ["share", "Share"],
                  ["trash", "Delete"],
                ].map(([icon, label]) => (
                  <button
                    key={label}
                    type="button"
                    title={label === "Delete" ? "Delete report? Click to confirm" : label}
                    onClick={() => {
                      if (label === "View Analysis") {
                        setSelected(report);
                        setDetailOpen(true);
                      }
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111] transition hover:border-[#1D9E75]/50 hover:text-white ${label === "Delete" ? "text-[#ff6b6b] hover:border-[#ff6b6b]/40" : "text-[#888]"}`}
                    aria-label={label}
                  >
                    <Icon name={icon as IconName} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <EmptyState />
      </section>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <DetailPanel open={detailOpen} report={selected} onClose={() => setDetailOpen(false)} />
    </AppShell>
  );
}

function EmptyState() {
  return (
    <section className="mt-8 hidden rounded-xl border border-dashed border-white/[0.08] bg-[#111]/60 p-10 text-center">
      <svg className="mx-auto h-20 w-20 text-[#1D9E75]" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <rect x="28" y="20" width="64" height="80" rx="12" fill="rgba(29,158,117,0.12)" stroke="currentColor" />
        <path d="M43 47h34M43 62h22M55 79h10M60 74v10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <h2 className="mt-5 text-xl font-bold text-white">No reports yet</h2>
      <p className="mt-2 text-sm text-[#888]">Upload your first health report to get started</p>
      <button type="button" className="mt-6 rounded-lg bg-[#1D9E75] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0F6E56]">Upload Report</button>
    </section>
  );
}

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="w-full max-w-[520px] rounded-xl border border-white/[0.08] bg-[#111] p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="upload-title" className="text-xl font-bold text-white">Upload Health Report</h2>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg text-[#888] transition hover:bg-white/[0.06] hover:text-white" aria-label="Close upload modal">×</button>
        </div>
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.14] bg-[#0d0d0d] px-4 py-8 text-center transition hover:border-[#1D9E75]">
          <Icon name="upload" className="h-9 w-9 text-[#1D9E75]" />
          <span className="mt-3 text-sm font-semibold text-white">Drop your PDF or image here</span>
          <span className="mt-1 text-sm text-[#888]">or browse files</span>
          <span className="mt-3 text-xs text-[#888]">PDF, JPG, PNG · Max 10MB</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#161616] p-3">
            <Icon name="file" className="h-5 w-5 text-[#1D9E75]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
              <p className="text-xs text-[#888]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button type="button" onClick={() => setFile(null)} className="text-xl text-[#888] hover:text-white" aria-label="Remove file">×</button>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <select className="auth-select"><option>CBC</option><option>Lipid Panel</option><option>Thyroid</option><option>HbA1c</option><option>Vitamin Panel</option><option>Other</option></select>
          <select className="auth-select"><option>Apollo Diagnostics</option><option>Thyrocare</option><option>Lal Path Labs</option><option>Other</option></select>
          <input type="date" className="auth-input-wrap h-11 px-3 text-sm text-[#ccc] outline-none" />
          <textarea className="auth-input-wrap min-h-[92px] px-3 py-3 text-sm text-white outline-none sm:col-span-2" placeholder="Add notes for this report..." />
        </div>
        <button type="button" className="auth-primary-btn mt-5">Upload & Analyze</button>
        <button type="button" onClick={onClose} className="mt-4 block w-full text-sm font-medium text-[#888] hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

function DetailPanel({ open, report, onClose }: { open: boolean; report: (typeof reports)[number]; onClose: () => void }) {
  const [tab, setTab] = useState("Summary");
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto bg-black/60" : "pointer-events-none bg-transparent"}`} aria-hidden={!open}>
      <aside className={`absolute right-0 top-0 h-full w-full max-w-[480px] overflow-y-auto border-l border-white/[0.08] bg-[#0a0a0a] p-5 shadow-2xl transition-transform duration-200 sm:p-6 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#1D9E75]">{report.lab}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{report.name}</h2>
            <p className="mt-1 text-sm text-[#888]">{report.date} · {report.type}</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg text-[#888] transition hover:bg-white/[0.06] hover:text-white" aria-label="Close detail panel">×</button>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {["Summary", "Biomarkers", "AI Analysis", "Raw Report"].map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === item ? "bg-[#1D9E75] text-white" : "bg-[#111] text-[#888] hover:text-white"}`}>{item}</button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "Summary" ? (
            <div className="space-y-4 text-sm leading-6 text-[#ccc]">
              <p>Your report is largely stable with a few values worth monitoring. Vaidy noticed Vitamin D remains below the preferred range, while hemoglobin and HbA1c are healthy.</p>
              <div className="rounded-xl border border-[#1D9E75]/20 bg-[#1D9E75]/10 p-4">
                <h3 className="font-bold text-white">Key findings</h3>
                <p className="mt-2 text-[#ccc]">Maintain current diet habits, discuss Vitamin D supplementation with your physician, and repeat CBC in 8-12 weeks.</p>
              </div>
            </div>
          ) : null}
          {tab === "Biomarkers" ? (
            <div className="overflow-hidden rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111] text-[#888]"><tr>{["Biomarker", "Value", "Unit", "Range", "Status"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {biomarkers.map((row) => (
                    <tr key={row[0]} className="border-t border-white/[0.06]">
                      {row.map((cell, index) => <td key={cell} className="px-3 py-3 text-[#ccc]">{index === 4 ? <StatusBadge status={cell} /> : cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {tab === "AI Analysis" ? (
            <div className="rounded-2xl rounded-tl-md border border-[#1D9E75]/20 bg-[#1D9E75]/10 p-5 text-sm leading-7 text-[#d7fff1]">
              Ananya, your recovery markers look encouraging. The main opportunity is Vitamin D consistency: sunlight exposure, dietary sources, and a doctor-approved supplement plan can help bring this into range.
            </div>
          ) : null}
          {tab === "Raw Report" ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-[#111] text-sm text-[#888]">
              PDF viewer placeholder
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
