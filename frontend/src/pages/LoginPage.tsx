import { ArrowRight, LogIn, MessageCircle, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appName } from "../constants/brand";
import { languages } from "../constants/languages";
import { apiErrorMessage } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { LanguageCode } from "../types";

type Props = {
  initialMode?: "login" | "register";
};

export const LoginPage = ({ initialMode = "login" }: Props) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<LanguageCode>("en");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ username, email, password, preferredLanguage });
      }
      navigate("/app", { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-4 py-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-white shadow-soft md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[560px] overflow-hidden bg-ink p-8 text-white md:block">
          <div className="absolute left-8 top-8 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white text-brand">
              <MessageCircle size={23} />
            </span>
            <p className="text-3xl font-black tracking-normal">{appName}</p>
          </div>

          <div className="absolute left-20 top-36 h-28 w-44 rounded-lg bg-white/10" />
          <div className="absolute right-10 top-52 h-20 w-32 rounded-lg bg-brand/70" />
          <div className="absolute bottom-36 left-12 h-20 w-56 rounded-lg bg-white/10" />
          <div className="absolute bottom-8 left-8 right-8 grid grid-cols-4 gap-3">
            <span className="h-16 rounded-md bg-brand" />
            <span className="h-16 rounded-md bg-mint" />
            <span className="h-16 rounded-md bg-coral" />
            <span className="h-16 rounded-md bg-plum" />
            <span className="h-16 rounded-md bg-white/20" />
            <span className="h-16 rounded-md bg-white/10" />
            <span className="h-16 rounded-md bg-brand/70" />
            <span className="h-16 rounded-md bg-mint/70" />
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex min-h-[560px] flex-col justify-center p-6 sm:p-9"
        >
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white">
              <MessageCircle size={21} />
            </span>
            <p className="text-3xl font-black tracking-normal text-ink">
              {appName}
            </p>
          </div>

          <div className="mb-7 flex rounded-md border border-line bg-panel p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold ${
                mode === "login"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <LogIn size={16} />
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold ${
                mode === "register"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <UserPlus size={16} />
              Sign up
            </button>
          </div>

          <div className="space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink">
                  Username
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  placeholder="yourname"
                  className="w-full rounded-md border border-line bg-panel px-3 py-3 outline-none focus:border-brand"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-md border border-line bg-panel px-3 py-3 outline-none focus:border-brand"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                placeholder="Password"
                className="w-full rounded-md border border-line bg-panel px-3 py-3 outline-none focus:border-brand"
              />
            </label>

            {mode === "register" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink">
                  Preferred language
                </span>
                <select
                  value={preferredLanguage}
                  onChange={(event) =>
                    setPreferredLanguage(event.target.value as LanguageCode)
                  }
                  className="w-full rounded-md border border-line bg-panel px-3 py-3 outline-none focus:border-brand"
                >
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting
              ? "Please wait"
              : mode === "login"
                ? "Login"
                : "Create account"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
};
