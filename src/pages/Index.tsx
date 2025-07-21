import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import MeetingSummaries from "@/components/MeetingSummaries";
import About from "@/components/About";
import Footer from "@/components/Footer";
import MobileBanner from "@/components/MobileBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MobileBanner />
      <Navigation />
      <Hero />
      <Features />
      <MeetingSummaries />
      <About />
      <Footer />
    </div>
  );
};

export default Index;
