import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Search, ExternalLink } from "lucide-react";

const MeetingSummaries = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Sample meeting data - in real app this would come from API
  const meetings = [
    {
      id: 1,
      title: "City Council Regular Meeting",
      date: "2024-01-15",
      time: "7:00 PM",
      type: "City Council",
      topics: ["Budget Review", "Park Development", "Traffic Safety"],
      summary: "Council reviewed the 2024 budget proposals, discussed the new community park project, and addressed traffic safety concerns on Foothill Boulevard.",
      attendees: 12,
      keyDecisions: ["Approved park development budget", "Initiated traffic study"],
      status: "Completed"
    },
    {
      id: 2,
      title: "Planning Commission Meeting",
      date: "2024-01-10",
      time: "6:30 PM",
      type: "Planning Commission",
      topics: ["Zoning Changes", "Development Permits", "Environmental Impact"],
      summary: "Commission reviewed three development applications, discussed proposed zoning amendments, and evaluated environmental impact assessments.",
      attendees: 8,
      keyDecisions: ["Approved residential development permit", "Recommended zoning amendment"],
      status: "Completed"
    },
    {
      id: 3,
      title: "Public Safety Committee",
      date: "2024-01-08",
      time: "4:00 PM",
      type: "Committee",
      topics: ["Emergency Preparedness", "Fire Safety", "Police Services"],
      summary: "Committee discussed emergency preparedness initiatives, reviewed fire safety protocols, and evaluated police service coverage areas.",
      attendees: 6,
      keyDecisions: ["Enhanced emergency communication plan", "Updated fire evacuation routes"],
      status: "Completed"
    }
  ];

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
    meeting.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="summaries" className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Recent <span className="text-primary">Meeting Summaries</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stay informed with AI-generated summaries of the latest government meetings. 
            Search, filter, and explore decisions that affect your community.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search meetings, topics, or decisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-xl border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Meeting Cards */}
        <div className="space-y-6">
          {filteredMeetings.map((meeting, index) => (
            <Card 
              key={meeting.id} 
              className="hover:shadow-card transition-all duration-300 border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl text-foreground">{meeting.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(meeting.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{meeting.attendees} attendees</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{meeting.type}</Badge>
                    <Badge 
                      variant={meeting.status === 'Completed' ? 'default' : 'outline'}
                      className={meeting.status === 'Completed' ? 'bg-accent text-accent-foreground' : ''}
                    >
                      {meeting.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Topics */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Topics Discussed</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.topics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-primary border-primary/30">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Summary</h4>
                  <p className="text-muted-foreground leading-relaxed">{meeting.summary}</p>
                </div>

                {/* Key Decisions */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Key Decisions</h4>
                  <ul className="space-y-1">
                    {meeting.keyDecisions.map((decision, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <span className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></span>
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border/50">
                  <Button className="bg-primary hover:bg-primary/90">
                    View Full Summary
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline">
                    View Original Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No meetings found matching your search criteria.</p>
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Meetings
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MeetingSummaries;