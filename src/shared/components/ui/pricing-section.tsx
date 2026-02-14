"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { CheckCheck, Zap, Brain, Route, BookOpen, Infinity } from "lucide-react";

const plans = [
  {
    name: "Free",
    badge: null,
    description: "The hook. Experience Coheren's AI analysis and get your first tasks — no card required.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    buttonText: "Start for free",
    popular: false,
    features: [
      { text: "1 Goal analysed by Agent", icon: <Brain size={18} /> },
      { text: "3 Days of personalised tasks", icon: <Route size={18} /> },
      { text: "Basic roadmap preview", icon: <BookOpen size={18} /> },
    ],
    includes: [
      "What's included:",
      "Shadow Extractor onboarding",
      "AI-generated micro-tasks",
      "Behavioural science foundation",
    ],
  },
  {
    name: "Pro",
    badge: "Most popular",
    description: "The full system. All 5 agents, unlimited goals, and a roadmap that adapts as you grow.",
    monthlyPrice: 10,
    yearlyPrice: 96,
    buttonText: "Get Pro",
    popular: true,
    features: [
      { text: "Full 5-Agent AI Pipeline", icon: <Zap size={18} /> },
      { text: "Unlimited Roadmaps & Goals", icon: <Infinity size={18} /> },
      { text: "RAG knowledge access", icon: <BookOpen size={18} /> },
    ],
    includes: [
      "Everything in Free, plus:",
      "Dynamic task recalibration",
      "Checkpoint & milestone tracking",
      "Priority support",
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="relative w-full bg-transparent overflow-hidden py-24 px-4">
      {/* Subtle purple glow top-center */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "700px",
          height: "300px",
          background:
            "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4">
            Pricing
          </p>
          <h2
            className="text-4xl font-light text-gray-900 sm:text-5xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Start free. Stay only if it works.
          </h2>
          <p className="mt-4 text-base text-gray-500 max-w-md mx-auto">
            No tricks. Try the AI for free — upgrade when you're hooked.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="relative flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                !isYearly ? "text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {!isYearly && (
                <motion.span
                  layoutId="pill"
                  className="absolute inset-0 rounded-full bg-violet-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative">Monthly</span>
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                isYearly ? "text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {isYearly && (
                <motion.span
                  layoutId="pill"
                  className="absolute inset-0 rounded-full bg-violet-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative">Yearly</span>
              <span className="relative rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
            >
              {/* Liquid glass card */}
              <div
                className="relative h-full rounded-3xl mt-4"
                style={{
                  background: plan.popular
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 50%, rgba(139,92,246,0.12) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.18) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: plan.popular
                    ? '1px solid rgba(139,92,246,0.4)'
                    : '1px solid rgba(255,255,255,0.5)',
                  boxShadow: plan.popular
                    ? '0 8px 32px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(255,255,255,0.1)'
                    : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {/* Top-left specular highlight */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }} />

                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-0.5 text-xs font-semibold text-white shadow-lg">
                    {plan.badge}
                  </span>
                )}

                <div className="p-6 pb-4">
                  <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-semibold text-gray-900">
                      $
                      <NumberFlow
                        value={isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                        className="text-5xl font-semibold"
                      />
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-gray-400 text-sm">
                        /{isYearly ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 flex flex-col gap-5">
                  <button
                    className={`w-full rounded-xl py-3 text-base font-medium transition-all duration-200 ${
                      plan.popular
                        ? "bg-violet-600 text-white shadow-md shadow-violet-900/30 hover:bg-violet-700"
                        : "text-gray-800 hover:text-violet-700"
                    }`}
                    style={!plan.popular ? {
                      background: 'rgba(255,255,255,0.6)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.7)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                    } : undefined}
                  >
                    {plan.buttonText}
                  </button>

                  {/* Feature list */}
                  <ul className="space-y-2.5">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-3">
                        <span className="text-violet-500 flex-shrink-0">{f.icon}</span>
                        <span className="text-sm text-gray-600">{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center text-xs text-gray-400 mt-8"
        >
          No credit card required for Free plan · Cancel Pro anytime
        </motion.p>
      </div>
    </section>
  );
}
