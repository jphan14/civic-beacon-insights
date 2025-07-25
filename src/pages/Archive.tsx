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
import { useCivicSummaries } from "@/hooks/useCivicData";
import type { CivicSummary } from "@/services/civicApi";

const Archive = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommission, setSelectedCommission] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Match API default
  
  // Use the enhanced hook with proper pagination and filtering
  const { summaries, statistics, pagination, loading: isLoading, error, refetch } = useCivicSummaries({
    page: currentPage,
    limit: itemsPerPage,
    // Pass commission filter to API if not "all"
    commission: selectedCommission !== "all" ? [selectedCommission] : undefined,
  });
  
  // Filter summaries by search term (client-side for now)
  const searchFilteredMeetings = summaries.filter(meeting => {
    if (!searchTerm) return true;
    return meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           meeting.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
           meeting.government_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
           meeting.commission?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Apply client-side date filtering (since API doesn't support it yet)
  const dateFilteredMeetings = searchFilteredMeetings.filter(meeting => {
    if (dateRange === "all") return true;
    
    try {
      const meetingDate = new Date(meeting.date);
      const now = new Date();
      
      switch (dateRange) {
        case "30-days":
          return (now.getTime() - meetingDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
        case "3-months":
          return (now.getTime() - meetingDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
        case "6-months":
          return (now.getTime() - meetingDate.getTime()) <= (180 * 24 * 60 * 60 * 1000);
        case "1-year":
          return (now.getTime() - meetingDate.getTime()) <= (365 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    } catch (error) {
      return true;
    }
  });
  
  // Sort the filtered meetings
  const sortedMeetings = dateFilteredMeetings.sort((a, b) => {
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
  
  // Use API pagination info when available
  const totalCount = pagination?.total_count || summaries.length;
  const totalPages = pagination?.total_pages || Math.ceil(sortedMeetings.length / itemsPerPage);
  const paginatedMeetings = pagination ? summaries : sortedMeetings; // Use API results if paginated, otherwise use sorted
  
  // Get unique commissions for filter (from all available data)
  const commissions = Array.from(new Set(summaries.map(meeting => meeting.commission).filter(Boolean)));
  
  // Reset page when commission filter changes (triggers new API call)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCommission]);
  
  // Handle search, date range and sort changes (client-side, so reset page)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, sortBy]);
  
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
              Showing {paginatedMeetings.length} of {totalCount} meetings
              <span className="text-sm ml-2">(Page {currentPage} of {totalPages})</span>
              {pagination && (
                <span className="text-xs block sm:inline sm:ml-2 text-muted-foreground/80">
                  Server-side pagination active
                </span>
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
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {/* Show page numbers around current page */}
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
                    disabled={isLoading}
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
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && paginatedMeetings.length === 0 && (
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