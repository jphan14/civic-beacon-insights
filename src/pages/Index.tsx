import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import MeetingSummaries from "@/components/MeetingSummaries";
import About from "@/components/About";
import Footer from "@/components/Footer";
import FeedbackWidget from "@/components/FeedbackWidget";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      
      <Navigation />
      <Hero />
      <Features />
      <MeetingSummaries />
      <About />
      <Footer />
      <FeedbackWidget />
    </div>
  );
};

export default Index;
