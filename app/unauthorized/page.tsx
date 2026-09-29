
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff8fa] p-6">
      <div className="w-full max-w-lg rounded-3xl border border-[#f3dce5] bg-white p-10 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl dunkin-gradient text-2xl font-black text-white">
          D
        </div>

        <h1 className="mt-6 text-3xl font-black text-[#4a2633]">
          Access Restricted
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your account does not have permission to access this
          section of the Dunkin Maintenance Control Tower.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-[#f582ae] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#e85d91]"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}

