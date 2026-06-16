"use client";

import { Activity, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Docs", href: "#" },
  { label: "Pricing", href: "#" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname()
  if (currentPath.includes("/dashboard")) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md mb-16">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <Activity className="size-5 text-primary" />
          redline
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeSwitcher />
          <Link href="/dashboard">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/40 bg-background md:hidden"
          >
            <div className="px-4 pb-4 pt-2">
              <div className="px-2 pb-3">
                <ThemeSwitcher />
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 px-2">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                  >
                    Sign in
                  </Button>
                </Link>
                <Button size="sm" className="w-full justify-center">
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
