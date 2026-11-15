import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import type { IconType } from 'react-icons';
import { CgProfile } from 'react-icons/cg';
import { FaRegCalendar } from 'react-icons/fa';
import { IoMdSettings } from 'react-icons/io';
import { RxDashboard } from 'react-icons/rx';
import { getConfig } from '@/lib/config';

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

const mainLinks: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: RxDashboard },
  { href: '/profile', label: 'Profile', icon: CgProfile },
  { href: '/bookings', label: 'Bookings', icon: FaRegCalendar },
];

const settingsLink: NavItem = { href: '/settings', label: 'Settings', icon: IoMdSettings };

function NavLink({ href, label, icon: Icon }: NavItem) {
  return (
    <Link href={href} className="flex items-center gap-2 text-xs hover:text-sky-400">
      <Icon />
      {label}
    </Link>
  );
}

/** Reads APP_ENV at request time, so the same image shows dev or prod. */
async function EnvBadge() {
  await connection();
  const { appEnv } = getConfig();
  const color = appEnv === 'production' ? 'bg-emerald-700' : 'bg-amber-600';
  return <span className={`${color} rounded px-2 py-0.5 text-[10px] text-white`}>{appEnv}</span>;
}

export default function Nav() {
  return (
    <header className="sticky top-0 h-screen w-56 shrink-0 flex flex-col justify-between p-5 bg-black text-white uppercase">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-2">
          <h1 className="font-bold text-xl">SLCM EX 1</h1>
          <Suspense fallback={null}>
            <EnvBadge />
          </Suspense>
        </div>
        <nav className="flex flex-col gap-4">
          {mainLinks.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </div>

      <div className="pb-2">
        <NavLink {...settingsLink} />
      </div>
    </header>
  );
}
