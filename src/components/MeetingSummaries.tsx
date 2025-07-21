import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Users, Search, ExternalLink, AlertCircle, Loader2, RefreshCcw, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useCivicSummaries } from "@/hooks/useCivicData";

const MeetingSummaries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  
  // Fetch real data from API
  const { summaries, statistics, loading: isLoading, error, refetch } = useCivicSummaries();
  
  // Filter summaries based on search term
  const filteredMeetings = summaries.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.government_body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle expanded state for a meeting
  const toggleMeetingExpanded = (meetingId: string) => {
    const newExpanded = new Set(expandedMeetings);
    if (newExpanded.has(meetingId)) {
      newExpanded.delete(meetingId);
    } else {
      newExpanded.add(meetingId);
    }
    setExpandedMeetings(newExpanded);
  };

  // Function to format summary text with enumerated headings
  const formatSummaryText = (text: string) => {
    // Split by line breaks first to avoid issues with years and numbers in content
    const lines = text.split('\n');
    const sections: string[] = [];
    let currentSection = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header (number followed by period and text, or all caps with colon)
      const isNumberedHeader = /^\d+\.\s+[A-Z]/.test(trimmedLine);
      const isAllCapsHeader = /^[A-Z][A-Z\s]*:/.test(trimmedLine);
      const isTitleCaseHeader = /^[A-Z][^.]*:/.test(trimmedLine) && trimmedLine.split(':')[0].length > 3;
      
      if ((isNumberedHeader || isAllCapsHeader || isTitleCaseHeader) && currentSection.trim()) {
        // Save previous section
        sections.push(currentSection.trim());
        currentSection = trimmedLine;
      } else if (isNumberedHeader || isAllCapsHeader || isTitleCaseHeader) {
        // Start new section
        currentSection = trimmedLine;
      } else {
        // Add to current section
        if (currentSection) {
          currentSection += '\n' + line;
        } else {
          currentSection = line;
        }
      }
    });
    
    // Add the last section
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      const trimmedSection = section.trim();
      const lines = trimmedSection.split('\n');
      const firstLine = lines[0];
      const restOfContent = lines.slice(1).join('\n').trim();
      
      // Check if first line is a header
      const isNumbered = /^\d+\.\s/.test(firstLine);
      const isHeading = /^[A-Z][A-Z\s]*:/.test(firstLine) || /^[A-Z][^.]*:/.test(firstLine);
      
      if (isNumbered || isHeading) {
        const [heading, ...contentParts] = firstLine.split(/:\s?/);
        const headerContent = contentParts.join(': ');
        const fullContent = headerContent + (restOfContent ? '\n' + restOfContent : '');
        
        return (
          <div key={index} className="mb-4">
            <h5 className="font-semibold text-foreground mb-2 flex items-center">
              {heading}{heading.endsWith(':') ? '' : ':'}
            </h5>
            {fullContent && (
              <div className="text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
                {fullContent}
              </div>
            )}
          </div>
        );
      }
      
      // For sections without clear headers, add enumeration if significant
      if (trimmedSection.length > 50) {
        return (
          <div key={index} className="mb-4">
            <h5 className="font-semibold text-foreground mb-2 flex items-center">
              <span className="text-primary mr-2">{index + 1}.</span>
              Summary Section
            </h5>
            <div className="text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
              {trimmedSection}
            </div>
          </div>
        );
      }
      
      return (
        <div key={index} className="text-muted-foreground leading-relaxed mb-2 whitespace-pre-line">
          {trimmedSection}
        </div>
      );
    }).filter(Boolean);
  };

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
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg text-muted-foreground">Loading meeting summaries...</span>
          </div>
        )}

        
        {/* Debug Status Display */}
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg text-sm">
          <div><strong>Debug Status:</strong></div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Error: {error || 'None'}</div>
          <div>Summaries Count: {summaries?.length || 0}</div>
          <div>Statistics: {statistics?.total_documents || 0} docs from {statistics?.government_bodies || 0} bodies</div>
        </div>

        {/* Error State */}
        {error && (
          <Alert className="mb-8 border-destructive/50 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span>Failed to load meeting summaries: {error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="ml-4"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <strong>Connected to QNAP API:</strong> 
                <br />
                <code>{navigator.userAgent && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                  ? 'http://hueyphanclub.myqnapcloud.com:8080' 
                  : 'https://hueyphanclub.myqnapcloud.com:8443'}</code>
                <br />
                {statistics?.total_documents && (
                  <span>Found {statistics.total_documents} documents from {statistics.government_bodies} government bodies</span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Display */}
        {!isLoading && !error && statistics?.total_documents && (
          <div className="mb-8 p-6 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.total_documents}</div>
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.government_bodies}</div>
                <div className="text-sm text-muted-foreground">Government Bodies</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.ai_summaries}</div>
                <div className="text-sm text-muted-foreground">AI Summaries</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.recent_updates}</div>
                <div className="text-sm text-muted-foreground">Recent Updates</div>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Cards */}
        <div className="space-y-6">
          {filteredMeetings.map((meeting, index) => {
            const meetingId = meeting.id || meeting.created_at + index;
            const isExpanded = expandedMeetings.has(meetingId);
            
            return (
              <Card 
                key={meetingId} 
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
                           <span>{(() => {
                             try {
                               const date = new Date(meeting.date);
                               return isNaN(date.getTime()) ? meeting.date : date.toLocaleDateString('en-US', { 
                                 weekday: 'long', 
                                 year: 'numeric', 
                                 month: 'long', 
                                 day: 'numeric' 
                               });
                             } catch (error) {
                               console.error('Date parsing error:', error, 'for date:', meeting.date);
                               return meeting.date;
                             }
                           })()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{meeting.government_body}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{meeting.government_body}</Badge>
                      <Badge variant="outline">{meeting.document_type}</Badge>
                      {meeting.ai_generated && (
                        <Badge variant="default" className="bg-accent text-accent-foreground">
                          AI Generated
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Summary Preview (first 200 characters) */}
                  <div>
                    <div className="mb-3">
                      <h4 className="font-semibold text-foreground text-lg mb-4">Meeting Summary</h4>
                      
                      <Collapsible open={isExpanded} onOpenChange={() => toggleMeetingExpanded(meetingId)}>
                        <div className="space-y-4">
                          {!isExpanded && (
                            <>
                              <p className="text-muted-foreground leading-relaxed">
                                {meeting.summary.length > 200 
                                  ? `${meeting.summary.substring(0, 200)}...`
                                  : meeting.summary
                                }
                              </p>
                              
                              <div className="pt-4">
                                <CollapsibleTrigger asChild>
                                  <Button variant="outline" size="default" className="border-primary/20 text-primary hover:bg-primary/5">
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Read Full Summary
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </>
                          )}
                          
                          <CollapsibleContent className="space-y-4 animate-accordion-down data-[state=closed]:animate-accordion-up">
                            {formatSummaryText(meeting.summary)}
                            <div className="pt-4 border-t border-border/30">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  Show Less
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Full Document
                    </Button>
                    <Button variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      View {meeting.document_type === 'agenda' ? 'Agenda' : 'Minutes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && !error && filteredMeetings.length === 0 && summaries.length > 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No meetings found matching your search criteria.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          </div>
        )}

        {!isLoading && !error && summaries.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No meeting summaries available.</p>
            <p className="text-muted-foreground mt-2">Check your API connection or try again later.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}

        {!isLoading && !error && filteredMeetings.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Meetings
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MeetingSummaries;
