import { GithubIcon, InstagramIcon, LinkedinIcon, TwitterIcon } from 'lucide-react';
import { Icons } from '@shared/components/ui/icons';

const product = [
  { title: 'How it Works', href: '#how-it-works' },
  { title: 'Features',     href: '#roadmap-preview' },
  { title: 'Why Coheren',  href: '#why-coheren' },
  { title: 'The Science',  href: '#science' },
];

const legal = [
  { title: 'Privacy Policy',   href: '#' },
  { title: 'Terms of Service', href: '#' },
  { title: 'Security',         href: '#' },
];

const support = [
  { title: 'Help Center',     href: '#' },
  { title: 'Contact Support', href: '#' },
  { title: 'Community',       href: '#' },
];

const socialLinks = [
  { label: 'Twitter',   icon: <TwitterIcon   className="size-3.5" />, href: 'https://twitter.com' },
  { label: 'GitHub',    icon: <GithubIcon    className="size-3.5" />, href: 'https://github.com' },
  { label: 'Instagram', icon: <InstagramIcon className="size-3.5" />, href: 'https://instagram.com' },
  { label: 'LinkedIn',  icon: <LinkedinIcon  className="size-3.5" />, href: 'https://linkedin.com' },
];

export function MinimalFooter() {
  const year = new Date().getFullYear();

  const scrollTo = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative z-[100] bg-white overflow-hidden">

      {/* Purple glow — bottom center */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: '800px',
          height: '260px',
          background: 'radial-gradient(ellipse 65% 55% at 50% 100%, rgba(139,92,246,0.45) 0%, rgba(109,40,217,0.2) 45%, transparent 72%)',
          filter: 'blur(1px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">

        {/* Top divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Main row: brand left, link columns right */}
        <div className="py-12 flex flex-col sm:flex-row gap-10 sm:gap-16 items-start">

          {/* Left — brand content */}
          <div className="shrink-0 w-full sm:w-72 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Icons.logo className="h-6 w-6 text-violet-600" />
              <span className="text-base font-semibold text-slate-900 tracking-tight">coheren.ai</span>
            </div>
            <div>
              <p className="text-3xl font-light text-slate-900 leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Backed by science.<br />
                <span className="text-violet-600">Built for you.</span>
              </p>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                AI that turns your goals into one simple task per day.
              </p>
            </div>
            <div className="flex gap-2">
              {socialLinks.map(({ label, icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Right — 3 link columns */}
          <div className="flex flex-1 justify-end gap-10 sm:gap-12">

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Product</p>
              <ul className="space-y-2.5">
                {product.map(({ href, title }) => (
                  <li key={title}>
                    <a href={href} onClick={e => { e.preventDefault(); scrollTo(href); }}
                      className="text-sm text-slate-600 hover:text-violet-600 transition-colors">
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Support</p>
              <ul className="space-y-2.5">
                {support.map(({ href, title }) => (
                  <li key={title}>
                    <a href={href} className="text-sm text-slate-600 hover:text-violet-600 transition-colors">
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Legal</p>
              <ul className="space-y-2.5">
                {legal.map(({ href, title }) => (
                  <li key={title}>
                    <a href={href} className="text-sm text-slate-600 hover:text-violet-600 transition-colors">
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            © {year} coheren.ai — All rights reserved.
          </p>
          <p className="text-xs text-slate-300">
            Made with care for goal-setters everywhere.
          </p>
        </div>

      </div>
    </footer>
  );
}
