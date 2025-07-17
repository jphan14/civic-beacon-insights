import { Card, CardContent } from "@/components/ui/card";
import { FileText, Search, Archive, Zap, Users, Shield } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: FileText,
      title: "Automated Summaries",
      description: "AI-powered meeting summaries that capture key decisions, discussions, and action items from every government meeting.",
      color: "primary"
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Find specific topics, decisions, or discussions across all meeting records with intelligent search capabilities.",
      color: "accent"
    },
    {
      icon: Archive,
      title: "Historical Archives",
      description: "Complete historical record of all La Cañada Flintridge government meetings, organized and easily accessible.",
      color: "primary"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Get the latest meeting summaries as soon as they're processed, keeping you informed of recent government activities.",
      color: "accent"
    },
    {
      icon: Users,
      title: "Community Access",
      description: "Free public access to all government information, promoting transparency and civic engagement.",
      color: "primary"
    },
    {
      icon: Shield,
      title: "Reliable & Accurate",
      description: "Verified summaries with links to original documents, ensuring accuracy and accountability.",
      color: "accent"
    }
  ];

  return (
    <section id="features" className="py-20 bg-civic-light/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Powerful Features for 
            <span className="text-primary"> Civic Transparency</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our platform combines cutting-edge AI technology with a commitment to open government, 
            making public information more accessible than ever before.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8 space-y-4">
                <div className={`p-3 rounded-xl w-fit ${
                  feature.color === 'primary' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-accent/10 text-accent'
                }`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;