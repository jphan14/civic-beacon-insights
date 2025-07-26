import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Users, Bot } from "lucide-react";
import heroImage from "@/assets/civic-hero.jpg";
import { useCivicSummariesSimple } from "@/hooks/useCivicData";
import { Link } from "react-router-dom";

const Hero = () => {
  const { summaries, pagination } = useCivicSummariesSimple();
  
  // Use total count from pagination, fallback to summaries length
  const totalMeetings = pagination?.total_count || summaries.length;
  const roundedDownCount = Math.floor(totalMeetings / 100) * 100;
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-subtle"></div>
      <div 
        className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      ></div>
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Making Local Government<br />
                <span className="text-primary">Transparent</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Automated meeting summaries and historical archives for La Cañada Flintridge. 
                Access government information easily with AI-powered transparency tools.
              </p>
            </div>

            {/* Stats */}
            <div className="py-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Meetings Count Button */}
                <Link to="/archive">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-4 p-6 h-auto bg-card hover:bg-accent/50 border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-foreground">
                        1,800+ Meetings
                      </div>
                      <div className="text-base text-muted-foreground">Historical Archives</div>
                    </div>
                  </Button>
                </Link>

                {/* AI Assistant Button */}
                <Link to="/chat">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-4 p-6 h-auto bg-card hover:bg-accent/50 border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="p-3 bg-accent/10 rounded-xl">
                      <Bot className="h-8 w-8 text-accent" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-foreground">
                        AI Assistant
                      </div>
                      <div className="text-base text-muted-foreground">Ask Questions</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative animate-scale-in">
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Civic engagement and transparency" 
                className="rounded-2xl shadow-card w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-civic opacity-20 rounded-2xl"></div>
            </div>
            
            {/* Floating cards */}
            <div className="absolute -top-6 -right-6 bg-card p-4 rounded-xl shadow-card border animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Latest Summary</div>
                  <div className="text-xs text-muted-foreground">City Council Meeting</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;