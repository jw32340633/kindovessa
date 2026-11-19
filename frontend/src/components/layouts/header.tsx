import Link from "next/link";
import HeaderCart from "@/components/layouts/header/header-cart";
import HeaderSearch from "@/components/layouts/header/header-search";
import HeaderHelp from "@/components/layouts/header/header-help";
import Logo from "../../../public/favicons/logo";

function Header() {
  return (
    <header className="relative z-20 w-full border-b border-border bg-white text-heading">
      <div className="page-layout grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 py-5 md:gap-x-6 md:py-6 lg:min-h-26 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-10 lg:py-5">
        <Link href="/" aria-label="Kindovessa home" className="min-w-0 w-fit rounded-sm leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <Logo className="max-w-full align-middle text-[clamp(2rem,5vw,2.75rem)] max-md:text-[clamp(1.5rem,6vw,2rem)]" />
        </Link>

        <HeaderSearch />

        <div className="col-start-2 row-start-1 flex items-center gap-1 md:gap-4 lg:col-start-3 lg:gap-5">
          <HeaderHelp />
          <span
            aria-hidden="true"
            className="hidden h-7 w-px bg-border md:block"
          />
          <HeaderCart />
        </div>
      </div>
    </header>
  );
}

export default Header;
