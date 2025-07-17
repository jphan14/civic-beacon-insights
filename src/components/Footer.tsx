import { Button } from "@/components/ui/button";
import { Github, Mail, ExternalLink, Heart } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xl font-bold">LCF Civic Portal</h3>
            <p className="text-background/80 leading-relaxed max-w-md">
              Making La Cañada Flintridge government more transparent and accessible 
              through AI-powered meeting summaries and historical archives.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="text-background hover:bg-background/10">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-background hover:bg-background/10">
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Navigation</h4>
            <nav className="flex flex-col space-y-2">
              <a href="#summaries" className="text-background/80 hover:text-background transition-colors">
                Meeting Summaries
              </a>
              <a href="#archives" className="text-background/80 hover:text-background transition-colors">
                Historical Archives
              </a>
              <a href="#search" className="text-background/80 hover:text-background transition-colors">
                Search
              </a>
              <a href="#about" className="text-background/80 hover:text-background transition-colors">
                About
              </a>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Resources</h4>
            <nav className="flex flex-col space-y-2">
              <a 
                href="https://www.lcf.ca.gov" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-background/80 hover:text-background transition-colors flex items-center gap-1"
              >
                Official City Website
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="#" 
                className="text-background/80 hover:text-background transition-colors"
              >
                Meeting Calendar
              </a>
              <a 
                href="#" 
                className="text-background/80 hover:text-background transition-colors"
              >
                Contact City Hall
              </a>
              <a 
                href="#" 
                className="text-background/80 hover:text-background transition-colors"
              >
                Public Records Request
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-background/60 text-sm">
              © {currentYear} LCF Civic Portal. Built with transparency in mind.
            </div>
            <div className="flex items-center gap-2 text-background/80 text-sm">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-400" />
              <span>for civic engagement</span>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-background/60 text-center md:text-left">
            <p>
              This is an independent civic technology project and is not officially affiliated with the City of La Cañada Flintridge. 
              All meeting summaries are AI-generated and should be verified against official records.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;