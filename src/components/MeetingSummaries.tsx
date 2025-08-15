import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Users, ExternalLink, AlertCircle, Loader2, RefreshCcw, FileText, ChevronDown, ChevronUp, Bot, Sparkles, Archive as ArchiveIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useCivicSummariesSimple } from "@/hooks/useCivicData";
import type { CivicSummary } from "@/services/civicApi";

const MeetingSummaries = () => {
  
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  
  // Use the enhanced hook with backward compatibility
  const { summaries, statistics, loading: isLoading, error, refetch } = useCivicSummariesSimple();
  
  // Filter summaries to last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentSummaries = summaries.filter(meeting => {
    try {
      const meetingDate = new Date(meeting.date);
      return meetingDate >= ninetyDaysAgo;
    } catch (error) {
      console.error('Date parsing error:', error, 'for date:', meeting.date);
      return true; // Include meetings with unparseable dates
    }
  });
  
  const filteredMeetings = recentSummaries;

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
      // For sections without clear headers, just show the content
      if (trimmedSection.length > 50) {
        return (
          <div key={index} className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
            {trimmedSection}
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
            Stay informed with AI-generated summaries from government meetings.
          </p>
        </div>


        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg text-muted-foreground">Loading meeting summaries...</span>
          </div>
        )}


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
                <strong>Connected to Cloudflare API:</strong> 
                <br />
                <code>https://lawyer-ne-ide-administrative.trycloudflare.com</code>
                <br />
                {statistics?.total_documents && (
                  <span>Found {statistics.total_documents} documents from {statistics.government_bodies} government bodies</span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Display */}
        {!isLoading && !error && (statistics?.total_documents || statistics?.total_meetings) && (
          <div className="mb-8 p-6 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{filteredMeetings.length}</div>
                <div className="text-sm text-muted-foreground">Recent Meetings (90 days)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.government_bodies || 0}</div>
                <div className="text-sm text-muted-foreground">Government Bodies</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{statistics.ai_enhanced_count || statistics.ai_summaries || 0}</div>
                <div className="text-sm text-muted-foreground">AI Enhanced</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{summaries.length}</div>
                <div className="text-sm text-muted-foreground">Total Archive</div>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Cards */}
        <div className="space-y-6">
          {filteredMeetings.map((meeting, index) => {
            const meetingId = meeting.id || meeting.date + index;
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
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-2xl text-foreground">
                          {meeting.commission} - {meeting.title} ({(() => {
                            try {
                              const date = new Date(meeting.date);
                              return isNaN(date.getTime()) ? meeting.date : date.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              });
                            } catch (error) {
                              return meeting.date;
                            }
                          })()})
                        </CardTitle>
                        {meeting.url && (
                          <a
                            href={meeting.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Original
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
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
                         <span>{meeting.government_body}</span>
                       </div>
                     </div>
                       <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          {meeting.commission || meeting.government_body}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {meeting.document_type === "minutes" ? "Minutes" : meeting.document_type}
                        </Badge>
                        {meeting.ai_enhanced && (
                          <Badge variant="default" className="bg-primary text-primary-foreground flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            AI Enhanced
                          </Badge>
                        )}
                        {meeting.template_enhanced && !meeting.ai_enhanced && (
                          <Badge variant="outline">
                            Template Enhanced
                          </Badge>
                        )}
                        {meeting.ai_generated && !meeting.ai_enhanced && (
                          <Badge variant="default" className="bg-accent text-accent-foreground">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                   </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div>
                    {/* Two-column layout for content */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                        {/* Left Column - Summary */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-foreground text-base">📋 Full Summary</h5>
                          <div className="space-y-4">
                            {formatSummaryText(meeting.summary)}
                          </div>
                        </div>
                        
                        {/* Right Column - AI Analysis Components */}
                        <div className="space-y-6">
                          {/* Key Decisions */}
                          {meeting.ai_analysis?.key_decisions && meeting.ai_analysis.key_decisions.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">⚖️ Key Decisions</h5>
                              <div className="space-y-3">
                                {meeting.ai_analysis.key_decisions.map((decision, index) => (
                                  <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                    <p className="text-sm font-medium mb-2">{decision.decision}</p>
                                    {decision.vote_result && (
                                      <p className="text-xs text-muted-foreground">Vote: {decision.vote_result}</p>
                                    )}
                                    {decision.impact && (
                                      <p className="text-xs text-muted-foreground mt-1">Impact: {decision.impact}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Items */}
                          {meeting.ai_analysis?.action_items && meeting.ai_analysis.action_items.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">✅ Action Items</h5>
                              <div className="space-y-3">
                                {meeting.ai_analysis.action_items.map((item, index) => (
                                  <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                    <p className="text-sm font-medium mb-2">{item.action}</p>
                                    {item.responsible_party && (
                                      <p className="text-xs text-muted-foreground">Responsible: {item.responsible_party}</p>
                                    )}
                                    {item.timeline && (
                                      <p className="text-xs text-muted-foreground mt-1">Timeline: {item.timeline}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Financial Implications */}
                          {meeting.ai_analysis?.financial_implications && meeting.ai_analysis.financial_implications.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">💰 Financial Implications</h5>
                              <div className="space-y-3">
                                {meeting.ai_analysis.financial_implications.map((item, index) => (
                                  <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                    <p className="text-sm font-medium mb-2">{item.item}</p>
                                    {item.amount && (
                                      <p className="text-xs text-muted-foreground">Amount: {item.amount}</p>
                                    )}
                                    {item.impact && (
                                      <p className="text-xs text-muted-foreground mt-1">Impact: {item.impact}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Public Impact */}
                          {meeting.ai_analysis?.public_impact && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">🌍 Public Impact</h5>
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                <p className="text-sm">{meeting.ai_analysis.public_impact}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Next Steps */}
                          {meeting.ai_analysis?.next_steps && Array.isArray(meeting.ai_analysis.next_steps) && meeting.ai_analysis.next_steps.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">👣 Next Steps</h5>
                              <div className="space-y-2">
                                {meeting.ai_analysis.next_steps.map((step, index) => (
                                  <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                    <p className="text-sm">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Key Topics */}
                          {meeting.ai_insights?.key_topics && meeting.ai_insights.key_topics.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">🔑 Key Topics</h5>
                              <div className="flex flex-wrap gap-2">
                                {meeting.ai_insights.key_topics.map((topic, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Additional Public Impact from AI Insights */}
                          {meeting.ai_insights?.public_impact && meeting.ai_insights.public_impact !== meeting.ai_analysis?.public_impact && (
                            <div>
                              <h5 className="font-semibold text-foreground text-base mb-3">💡 Additional Insights</h5>
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                                <p className="text-sm">{meeting.ai_insights.public_impact}</p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
 
                   {/* Action Buttons */}
                   <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                    {meeting.agenda_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.agenda_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          Agenda
                        </a>
                      </Button>
                    )}
                    {meeting.minutes_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.minutes_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          Minutes
                        </a>
                      </Button>
                    )}
                    {meeting.video_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.video_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Video
                        </a>
                      </Button>
                    )}
                    {meeting.source_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Source
                        </a>
                      </Button>
                    )}
                    {meeting.pdf_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && !error && filteredMeetings.length === 0 && summaries.length > 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No recent meetings found.</p>
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

        {/* Archive Link */}
        {!isLoading && !error && (
          <div className="text-center mt-12 py-8 border-t border-border/50">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                Looking for older meetings?
              </h3>
              <p className="text-muted-foreground mx-auto">
                Browse our complete archive with advanced search and filtering.
              </p>
              <div className="pt-6">
                <Link to="/archive">
                  <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <ArchiveIcon className="h-4 w-4" />
                    View All Historical Meeting Summaries
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MeetingSummaries;
