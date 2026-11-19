import Headline from "@/components/layouts/headline";
import Header from "@/components/layouts/header";
import Footer from "@/components/layouts/footer";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Headline />
      <Header />
      {children}
      <Footer />
    </>
  );
}
