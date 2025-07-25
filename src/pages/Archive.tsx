import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, Search, ExternalLink, AlertCircle, Loader2, RefreshCcw, FileText, ChevronDown, ChevronUp, Bot, Sparkles, Filter, ArrowLeft, CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useCivicSummariesSimple } from "@/hooks/useCivicData";
import type { CivicSummary } from "@/services/civicApi";

const Archive = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommission, setSelectedCommission] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Use the enhanced hook
  const { summaries, statistics, loading: isLoading, error, refetch } = useCivicSummariesSimple();
  
  // Get unique commissions for filter
  const commissions = Array.from(new Set(summaries.map(meeting => meeting.commission).filter(Boolean)));
  
  // Filter and sort summaries
  const filteredAndSortedMeetings = summaries
    .filter(meeting => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.government_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.commission?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Commission filter
      const matchesCommission = selectedCommission === "all" || meeting.commission === selectedCommission;
      
      // Date range filter
      let matchesDate = true;
      if (dateRange !== "all") {
        const meetingDate = new Date(meeting.date);
        const now = new Date();
        
        switch (dateRange) {
          case "30-days":
            matchesDate = (now.getTime() - meetingDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
            break;
          case "3-months":
            matchesDate = (now.getTime() - meetingDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
            break;
          case "6-months":
            matchesDate = (now.getTime() - meetingDate.getTime()) <= (180 * 24 * 60 * 60 * 1000);
            break;
          case "1-year":
            matchesDate = (now.getTime() - meetingDate.getTime()) <= (365 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      
      return matchesSearch && matchesCommission && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "commission":
          return (a.commission || "").localeCompare(b.commission || "");
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMeetings.length / itemsPerPage);
  const paginatedMeetings = filteredAndSortedMeetings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCommission, dateRange, sortBy]);
  
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
    const lines = text.split('\n');
    const sections: string[] = [];
    let currentSection = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      const isNumberedHeader = /^\d+\.\s+[A-Z]/.test(trimmedLine);
      const isAllCapsHeader = /^[A-Z][A-Z\s]*:/.test(trimmedLine);
      const isTitleCaseHeader = /^[A-Z][^.]*:/.test(trimmedLine) && trimmedLine.split(':')[0].length > 3;
      
      if ((isNumberedHeader || isAllCapsHeader || isTitleCaseHeader) && currentSection.trim()) {
        sections.push(currentSection.trim());
        currentSection = trimmedLine;
      } else if (isNumberedHeader || isAllCapsHeader || isTitleCaseHeader) {
        currentSection = trimmedLine;
      } else {
        if (currentSection) {
          currentSection += '\n' + line;
        } else {
          currentSection = line;
        }
      }
    });
    
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      const trimmedSection = section.trim();
      const lines = trimmedSection.split('\n');
      const firstLine = lines[0];
      const restOfContent = lines.slice(1).join('\n').trim();
      
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Recent
              </Button>
            </Link>
          </div>
          
          <div className="text-center space-y-4">
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground">
              Meeting <span className="text-primary">Archive</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Browse and search through all historical government meeting summaries. 
              Use filters to find specific meetings, commissions, or time periods.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border/50 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>

            {/* Commission Filter */}
            <Select value={selectedCommission} onValueChange={setSelectedCommission}>
              <SelectTrigger>
                <SelectValue placeholder="All Commissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commissions</SelectItem>
                {commissions.map((commission) => (
                  <SelectItem key={commission} value={commission}>
                    {commission}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30-days">Last 30 Days</SelectItem>
                <SelectItem value="3-months">Last 3 Months</SelectItem>
                <SelectItem value="6-months">Last 6 Months</SelectItem>
                <SelectItem value="1-year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="commission">By Commission</SelectItem>
                <SelectItem value="title">By Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            </AlertDescription>
          </Alert>
        )}

        {/* Results Info */}
        {!isLoading && !error && (
          <div className="mb-6 flex items-center justify-between">
            <div className="text-muted-foreground">
              Showing {paginatedMeetings.length} of {filteredAndSortedMeetings.length} meetings
              {filteredAndSortedMeetings.length !== summaries.length && (
                <span> (filtered from {summaries.length} total)</span>
              )}
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedCommission !== "all" || dateRange !== "all" || sortBy !== "date-desc") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCommission("all");
                  setDateRange("all");
                  setSortBy("date-desc");
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Meeting Cards */}
        <div className="space-y-6">
          {paginatedMeetings.map((meeting, index) => {
            const meetingId = meeting.id || meeting.date + index;
            const isExpanded = expandedMeetings.has(meetingId);
            
            return (
              <Card 
                key={meetingId} 
                className="hover:shadow-card transition-all duration-300 border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
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
                             
                             {/* Show AI insights for enhanced meetings */}
                             {meeting.ai_insights && (
                               <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/30">
                                 <div className="flex items-center gap-2 mb-3">
                                   <Sparkles className="h-4 w-4 text-primary" />
                                   <h5 className="text-sm font-semibold">AI Insights</h5>
                                 </div>
                                 
                                 {meeting.ai_insights.key_topics && meeting.ai_insights.key_topics.length > 0 && (
                                   <div className="mb-3">
                                     <p className="text-xs text-muted-foreground mb-2">Key Topics:</p>
                                     <div className="flex flex-wrap gap-1">
                                       {meeting.ai_insights.key_topics.map((topic, index) => (
                                         <Badge key={index} variant="outline" className="text-xs">
                                           {topic}
                                         </Badge>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                                 
                                 {meeting.ai_insights.public_impact && (
                                   <div>
                                     <p className="text-xs text-muted-foreground mb-1">Public Impact:</p>
                                     <p className="text-sm">{meeting.ai_insights.public_impact}</p>
                                   </div>
                                 )}
                               </div>
                              )}
                              
                              {/* Show AI Analysis for enhanced meetings */}
                              {meeting.ai_analysis && (
                                <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/30">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Bot className="h-4 w-4 text-primary" />
                                    <h5 className="text-sm font-semibold">AI Analysis</h5>
                                  </div>
                                  
                                  {meeting.ai_analysis.key_decisions && meeting.ai_analysis.key_decisions.length > 0 && (
                                    <div className="mb-4">
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">Key Decisions:</p>
                                      <div className="space-y-2">
                                        {meeting.ai_analysis.key_decisions.map((decision, index) => (
                                          <div key={index} className="p-2 bg-background/50 rounded border border-border/20">
                                            <p className="text-sm font-medium">{decision.decision}</p>
                                            {decision.vote_result && (
                                              <p className="text-xs text-muted-foreground mt-1">Vote: {decision.vote_result}</p>
                                            )}
                                            {decision.impact && (
                                              <p className="text-xs text-muted-foreground mt-1">Impact: {decision.impact}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {meeting.ai_analysis.action_items && meeting.ai_analysis.action_items.length > 0 && (
                                    <div className="mb-4">
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">Action Items:</p>
                                      <div className="space-y-2">
                                        {meeting.ai_analysis.action_items.map((item, index) => (
                                          <div key={index} className="p-2 bg-background/50 rounded border border-border/20">
                                            <p className="text-sm font-medium">{item.action}</p>
                                            {item.responsible_party && (
                                              <p className="text-xs text-muted-foreground mt-1">Responsible: {item.responsible_party}</p>
                                            )}
                                            {item.timeline && (
                                              <p className="text-xs text-muted-foreground mt-1">Timeline: {item.timeline}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {meeting.ai_analysis.financial_implications && meeting.ai_analysis.financial_implications.length > 0 && (
                                    <div className="mb-4">
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">Financial Implications:</p>
                                      <div className="space-y-2">
                                        {meeting.ai_analysis.financial_implications.map((item, index) => (
                                          <div key={index} className="p-2 bg-background/50 rounded border border-border/20">
                                            <p className="text-sm font-medium">{item.item}</p>
                                            {item.amount && (
                                              <p className="text-xs text-muted-foreground mt-1">Amount: {item.amount}</p>
                                            )}
                                            {item.impact && (
                                              <p className="text-xs text-muted-foreground mt-1">Impact: {item.impact}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {meeting.ai_analysis.public_impact && (
                                    <div className="mb-4">
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">Public Impact:</p>
                                      <div className="p-2 bg-background/50 rounded border border-border/20">
                                        <p className="text-sm">{meeting.ai_analysis.public_impact}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {meeting.ai_analysis.next_steps && Array.isArray(meeting.ai_analysis.next_steps) && meeting.ai_analysis.next_steps.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">Next Steps:</p>
                                      <div className="space-y-2">
                                        {meeting.ai_analysis.next_steps.map((step, index) => (
                                          <div key={index} className="p-2 bg-background/50 rounded border border-border/20">
                                            <p className="text-sm">{step}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="pt-4">
                                <CollapsibleTrigger asChild>
                                  <Button variant="outline" size="default" className="border-primary/20 text-primary hover:bg-primary/5">
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && filteredAndSortedMeetings.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No meetings found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria to find more results.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedCommission("all");
                setDateRange("all");
                setSortBy("date-desc");
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Archive;