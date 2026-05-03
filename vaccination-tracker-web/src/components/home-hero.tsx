import { getApiBaseUrl } from "@/lib/config";

const pillars = [
  {
    title: "Family-first records",
    description:
      "Manage your own vaccines alongside children and dependents from a single secure account.",
  },
  {
    title: "Flexible schedule engine",
    description:
      "Start with India-based timelines and grow into region-aware schedules without redesigning the app.",
  },
  {
    title: "Verified proof",
    description:
      "Prepare for uploads, reminders, and downloadable certificates in an independently deployable stack.",
  },
];

export function HomeHero() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_45%,_#ffffff_75%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 shadow-[0_24px_80px_rgba(14,116,144,0.12)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 sm:px-8 md:px-10 lg:grid-cols-[1.3fr_0.9fr] lg:px-12 lg:py-12">
            <div className="space-y-6">
              <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold tracking-wide text-sky-800">
                Vaccination Tracker
              </span>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Vaccination records, reminders, and schedules in one responsive family hub.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  The web app and Rails API are separated from day one, so the
                  frontend and backend can be deployed independently without
                  changing the product architecture later.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`${apiBaseUrl}/api/v1/health`}
                  className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
                >
                  Check API health
                </a>
                <div className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-600">
                  API base URL: <span className="font-medium text-slate-900">{apiBaseUrl}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-slate-50 shadow-inner">
              <p className="text-sm font-medium text-sky-200">Milestone 1 foundation</p>
              <dl className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-sm text-slate-300">Backend</dt>
                  <dd className="mt-1 text-lg font-semibold">Rails 8 API on PostgreSQL</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-sm text-slate-300">Frontend</dt>
                  <dd className="mt-1 text-lg font-semibold">Next.js responsive web client</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-sm text-slate-300">Testing</dt>
                  <dd className="mt-1 text-lg font-semibold">Baseline API and UI checks ready</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
            >
              <h2 className="text-xl font-semibold text-slate-950">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
