import { useState, useEffect, useRef } from "react"
import { cn } from "@lib/utils"

const testimonials = [
  {
    id: 1,
    quote: "I used to start strong every January and fade by February. Coheren gave me one task a day — small enough to never skip. Six months later I ran my first half-marathon.",
    author: "Umair",
    role: "Athlete",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    quote: "Writing a thesis felt impossible until Coheren broke it into daily micro-goals. I stopped dreading my desk and started showing up. Submitted three weeks ahead of schedule.",
    author: "Arjuman",
    role: "Scholar",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    quote: "I've tried every productivity app. Coheren is the first one that actually understands the science — it doesn't just track tasks, it designs a learning arc. My ML skills compounded faster than I expected.",
    author: "Mehtab",
    role: "AI Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
]

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayedQuote, setDisplayedQuote] = useState(testimonials[0].quote)
  const [displayedRole, setDisplayedRole] = useState(testimonials[0].role)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleSelect = (index: number) => {
    if (index === activeIndex || isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setDisplayedQuote(testimonials[index].quote)
      setDisplayedRole(testimonials[index].role)
      setActiveIndex(index)
      setTimeout(() => setIsAnimating(false), 400)
    }, 200)
  }

  // Auto-rotate every 4 seconds; pause on hover
  const isPaused = useRef(false)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPaused.current) return
      const next = (activeIndex + 1) % testimonials.length
      handleSelect(next)
    }, 4000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isAnimating])

  return (
    /* Sits above the sticky science section — slides over it as you scroll */
    <section className="relative z-20 w-full bg-white">
      <div className="rounded-t-[3rem] bg-white min-h-screen flex flex-col items-center justify-center px-4 py-24" style={{ boxShadow: '0 -40px 80px rgba(0,0,0,0.35)' }}>
        <div className="max-w-3xl w-full flex flex-col items-center gap-10">

          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-500">
            What people are saying
          </p>

          {/* Quote — pause auto-rotate on hover */}
          <div
            className="relative px-8 text-center"
            onMouseEnter={() => { isPaused.current = true }}
            onMouseLeave={() => { isPaused.current = false }}
          >
            <span className="absolute -left-2 -top-6 text-8xl font-serif text-black/[0.05] select-none pointer-events-none leading-none">"</span>
            <p
              className={cn(
                "text-2xl md:text-3xl font-light text-gray-900 leading-relaxed transition-all duration-300 ease-out",
                isAnimating ? "opacity-0 blur-sm scale-[0.98]" : "opacity-100 blur-0 scale-100",
              )}
            >
              {displayedQuote}
            </p>
            <span className="absolute -right-2 -bottom-8 text-8xl font-serif text-black/[0.05] select-none pointer-events-none leading-none">"</span>
          </div>

          <div className="flex flex-col items-center gap-6 mt-2">
            {/* Role */}
            <p
              className={cn(
                "text-xs text-gray-400 tracking-[0.2em] uppercase transition-all duration-500",
                isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
              )}
            >
              {displayedRole}
            </p>

            {/* Avatar pills */}
            <div className="flex items-center justify-center gap-2">
              {testimonials.map((t, index) => {
                const isActive = activeIndex === index
                const isHovered = hoveredIndex === index && !isActive
                const showName = isActive || isHovered

                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={cn(
                      "relative flex items-center gap-0 rounded-full cursor-pointer",
                      "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      isActive ? "bg-gray-900 shadow-lg" : "bg-transparent hover:bg-gray-100",
                      showName ? "pr-4 pl-2 py-2" : "p-0.5",
                    )}
                  >
                    <img
                      src={t.avatar}
                      alt={t.author}
                      className={cn(
                        "w-8 h-8 rounded-full object-cover flex-shrink-0",
                        "transition-all duration-500",
                        isActive ? "ring-2 ring-white/30" : "ring-0",
                      )}
                    />
                    <div
                      className={cn(
                        "grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        showName ? "grid-cols-[1fr] opacity-100 ml-2" : "grid-cols-[0fr] opacity-0 ml-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <span
                          className={cn(
                            "text-sm font-medium whitespace-nowrap block transition-colors duration-300",
                            isActive ? "text-white" : "text-gray-900",
                          )}
                        >
                          {t.author}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
