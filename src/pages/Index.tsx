import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import MeetingSummaries from "@/components/MeetingSummaries";
import About from "@/components/About";
import Footer from "@/components/Footer";
import FeedbackWidget from "@/components/FeedbackWidget";
import DemoSection from "@/components/DemoSection";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      
      <Navigation />
      <Hero />
      <Features />
      <DemoSection />
      <MeetingSummaries />
      <About />
      <Footer />
      <FeedbackWidget />
    </div>
  );
};

export default Index;
