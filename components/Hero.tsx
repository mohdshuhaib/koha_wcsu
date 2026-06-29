'use client'

import Link from "next/link"
import { Send, BookOpen, ArrowRight, Library } from "lucide-react"

export default function Hero() {
  const shuhaib = (
    <a
      href="https://shuhaibcv.vercel.app"
      target="_blank"
      rel="noreferrer"
      className="font-bold text-button-yellow transition hover:text-yellow-300 hover:underline"
    >
      Shuhaib
    </a>
  )

  return (
    <section className="relative isolate overflow-hidden bg-primary-grey pt-16">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-10%] top-[8%] h-56 w-56 rounded-full bg-dark-green/20 blur-3xl sm:h-72 sm:w-72 lg:h-[24rem] lg:w-[24rem]" />
        <div className="absolute right-[-10%] top-[10%] h-56 w-56 rounded-full bg-button-yellow/20 blur-3xl sm:h-72 sm:w-72 lg:h-[24rem] lg:w-[24rem]" />
        <div className="absolute bottom-[5%] left-[20%] h-56 w-56 rounded-full bg-green-400/20 blur-3xl sm:h-72 sm:w-72 lg:h-[22rem] lg:w-[22rem]" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full py-4 sm:py-6">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/50 p-5 shadow-xl backdrop-blur-md sm:p-6 lg:p-10">
            <div className="text-center animate-fade-in-up">
              <div className="mb-4 flex justify-center sm:mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 sm:text-xs">
                    Wafy Campus Kalikkavu
                  </span>
                </div>
              </div>

              <div className="mx-auto max-w-4xl">
                <h1 className="font-heading text-3xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                  <span className="bg-gradient-to-b from-gray-800 to-gray-500 bg-clip-text text-transparent">
                    Welcome to
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-dark-green to-icon-green bg-clip-text text-transparent">
                    Campus Library
                  </span>
                </h1>
              </div>

              <div className="mx-auto mt-4 max-w-2xl space-y-2 sm:mt-6 sm:space-y-3">
                <p className="text-sm font-medium leading-relaxed text-heading-text-black sm:text-base md:text-lg">
                  Your Digital Companion for{" "}
                  <span className="text-dark-green underline decoration-wavy decoration-yellow-400/50 underline-offset-4">
                    Smarter Reading
                  </span>
                </p>
                <p className="text-xs leading-6 text-text-grey sm:text-sm md:text-base">
                  Explore a vast world of books, manage checkouts effortlessly, and stay updated
                  with real-time notifications.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
                <Link
                  href="/catalog"
                  className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-button-yellow px-5 py-3 text-sm font-bold uppercase tracking-wide text-button-text-black shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:px-7"
                >
                  <span>Browse Catalog</span>
                  <BookOpen size={18} />
                </Link>

                <Link
                  href="/login"
                  className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary-dark-grey bg-white/70 px-5 py-3 text-sm font-bold uppercase tracking-wide text-heading-text-black shadow-md backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-dark-green hover:bg-white hover:shadow-lg sm:px-7"
                >
                  <span>Librarian Login</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                  <Link
                    href="/member-login"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white/60 px-4 py-2.5 text-xs text-text-grey transition hover:bg-white/80 sm:text-sm"
                  >
                    <Library size={16} className="text-dark-green" />
                    <span>
                      Are you a member?{" "}
                      <span className="font-semibold text-dark-green">
                        Login here
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="pt-1 text-center text-[9px] uppercase tracking-[0.22em] text-gray-400 sm:text-[10px]">
                  Made with ❤️ by {shuhaib}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </section>
  )
}