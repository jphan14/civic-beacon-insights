import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Shield, Users, Code, Heart, ExternalLink } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Shield,
      title: "Transparency First",
      description: "We believe government information should be accessible to everyone, promoting accountability and informed civic participation."
    },
    {
      icon: Bot,
      title: "AI-Powered",
      description: "Advanced natural language processing ensures accurate, comprehensive summaries while maintaining the original context and meaning."
    },
    {
      icon: Users,
      title: "Community Focused",
      description: "Built for the residents of La Cañada Flintridge to stay informed about local government decisions that affect their daily lives."
    },
    {
      icon: Code,
      title: "Open Source",
      description: "Our platform is built with open source principles, ensuring transparency in our methods and allowing community contributions."
    }
  ];

  return (
    <section id="about" className="py-20 bg-civic-light/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
                About the <span className="text-primary">LCF Civic Portal</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                The La Cañada Flintridge Civic Portal is a government transparency initiative that uses 
                artificial intelligence to make local government more accessible to residents.
              </p>
            </div>

            <div className="prose prose-lg text-muted-foreground space-y-4">
              <p>
                Local government affects every aspect of our daily lives—from the roads we drive on 
                to the parks where our children play. Yet staying informed about government decisions 
                can be challenging due to lengthy meeting recordings, complex documents, and busy schedules.
              </p>
              <p>
                Our platform bridges this gap by automatically processing city council meetings, 
                planning commission sessions, and committee hearings to create clear, searchable summaries. 
                This technology makes it easier for residents to understand what's happening in their local government.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Heart className="mr-2 h-5 w-5" />
                Support This Project
              </Button>
              <Button variant="outline" size="lg">
                <Code className="mr-2 h-5 w-5" />
                View on GitHub
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Values Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <Card 
                key={value.title} 
                className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 border-border/50 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-20 text-center space-y-8">
          <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
            How It Works
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <h4 className="text-lg font-semibold text-foreground">Data Collection</h4>
              <p className="text-muted-foreground">
                We automatically collect meeting recordings, agendas, and documents from official city sources.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent text-accent-foreground rounded-xl flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <h4 className="text-lg font-semibold text-foreground">AI Processing</h4>
              <p className="text-muted-foreground">
                Advanced language models analyze the content to extract key topics, decisions, and action items.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <h4 className="text-lg font-semibold text-foreground">Public Access</h4>
              <p className="text-muted-foreground">
                Clean, searchable summaries are published immediately, making government information accessible to all.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;